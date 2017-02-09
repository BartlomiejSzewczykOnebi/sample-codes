/**
 * Copyright (C) OneBi Sp. z o.o. All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Created by Bartlomiej Szewczyk, 2016-04-20
 */
var newOrders = [];

//TODO: for now is in meteor methods cause of testing from client side
Meteor.methods({
    mwsCall: function () {
        // Checks whether user is logged in
        if(!this.userId)
            throw new Meteor.Error(403, "Unauthorized access");

        var user= Meteor.users.findOne(this.userId);

        // Executes only once, after user is authorized successfully.
        // Then for collecting orders will be responsible cron.
        if(user.profile.isVerified === true && OrderRequest.find({userId: this.userId}).count() === 0) {
            var date = moment(new Date).subtract(1, 'days').format();
            // Sets options for call based on
            var options = setListOrdersOption(CALL_TYPE.LIST_ORDERS_MAIN, user._id, date);

            var array=[];
            array.push(date);
            var newOrderRequest = OrderRequest.insert({
                userId: user._id,
                createdAt: new Date(),
                lastCollection: true,
                LastUpdatedBefore: array
            });
            mwsApiCall(options, newOrderRequest, user._id);
        }
    },//Downloading amazon products categories triggered by user.
    updateProductsByMws: function () {

        if(!this.userId)
            throw new Meteor.Error(403, "Unauthorized access");

        var userData = Meteor.user({_id: this.userId}).profile;
        var reportRequest = ReportRequest.findOne({marketplaceId: userData.marketplaceId});

        ReportRequest.update({_id: reportRequest._id},{
            $set:{
                lastUpdateDate: moment(new Date()).format(),
                status: REPORT_STATUS.UPDATING
            }
        });

        var options = setReportOption(CALL_TYPE.REQUEST_REPORT,this.userId, userData.marketplaceId, REPORT_TYPE.GET_XML_BROWSE_TREE_DATA, null, null);
        mwsApiCall(options, null, this.userId);
    }
});


/**
 * Returns String - request url for mwsApiCall
 * @options {Object} need to have:
 *
 * method: String - HTTP call method
 * base: String - base amazon mws address for europe is mws-eu.amazonservices.com
 * endpoint: String
 * params: Object {
 *  call parameters required:
 *  'Action': String - Mws Action to call
 *  'SellerId': String - Amazon Seller or Merchant id
 *  'MWSAuthToken': String - MWS Authorization Token,
 *  'Version': String - Version of MWS Api
 *  other parameters depends on Action.
 *  For more info see http://docs.developer.amazonservices.com/en_US/orders/2013-09-01/Orders_Overview.html
*  }
 */
mwsInit = (options) => {
    var method = options.method;
    var url = 'https://';
    url+=options.base;
    url+=options.endpoint;

    options.params.AWSAccessKeyId = Meteor.settings.private.AWSAccessKeyId;
    options.params.SignatureMethod = 'HmacSHA256';
    options.params.SignatureVersion = '2';
    options.params.Timestamp = new Date().toISOString();

    var paramsArr = [];
    for (param in options.params) {
        paramsArr.push([param, options.params[param]]);
    }
    paramsArr.sort(function (a, b) {
        return a[0] > b[0];
    });

    var keys = [];
    var vals = [];
    paramsArr.forEach(function (tuple) {
        keys.push(encodeURIComponent(tuple[0]));
        vals.push(encodeURIComponent(tuple[1]));
    });

    var paramsString = '';
    keys.forEach(function (key, index) {
        paramsString += key + '=' + vals[index];
        if (index !== keys.length - 1) {
            paramsString += '&';
        }
    });

    var query = [method, options.base, options.endpoint, paramsString];
    var queryString = query.join('\n');

    var AmzSecretKey = Meteor.settings.private.AmzSecretKey;

    var hmac = CryptoJS.HmacSHA256(queryString, AmzSecretKey);
    var signature = CryptoJS.enc.Base64.stringify(hmac);

    paramsString += '&Signature=' + encodeURIComponent(signature);

    url += '?' + paramsString;
    return url
};

/**
 * Make a call to Amazon MWS Api to authorize users MWS credentials
 * Method call synchronusly, so client can get results back
 */
authorizeUser = function(options, callback) {

    var url = mwsInit(options);
    HTTP.call(options.method,url,function( error, response ) {
        xml2js.parseString(response.content, function (err, result) {
            if(err){
                console.error('xml2js error',err);
            }else{
                var res = JSON.parse(JSON.stringify(result).replace("$","url"));

                if(res.ErrorResponse) {
                    var error= res.ErrorResponse.Error[0];
                    var text='';
                    if(error.Code[0] === ERROR.CODE.SERVICE_UNAVAILABLE)
                        text= 'Service currently unavailable. Please try later';

                    else text= 'Access denied. Invalid data';

                    MwsError.insert({
                        'createdAt': moment(new Date()).format(),
                        'content': res,
                        'type': 'register'
                    });
                    callback && callback (null, text);
                }
                else {
                    callback && callback (null, true);
                }
            }
        });
    });
};

/**
 * Make a call to Amazon MWS Api
 * To see what should be in options look at mwsInit()
 */
mwsApiCall = (options, orderRequestId, userId) => {
    var url = mwsInit(options);

    if(options.treeData === true){

        HTTP.call(options.method,url,function( error, response ) {

            var doc = response.content;
            var xmlDoc = new dom().parseFromString(doc);
            mwsSaveResponse(xmlDoc, options.params.Action, orderRequestId, userId);
        });
    }else{

        HTTP.call(options.method,url,function( error, response ) {
            xml2js.parseString(response.content, function (err, result) {
                if(err){
                    console.error('xml2js error',err);
                }else{
                    var response = JSON.parse(JSON.stringify(result).replace("$","url"));
                    mwsSaveResponse(response, options.params.Action, orderRequestId, userId);
                }
            });
        });
    }
};

/**
 *Saves response to database, depends on actionType
 */
mwsSaveResponse = (response, actionType, orderRequestId, userId) => {

    var orders;
    switch(actionType){

        case ACTION_TYPE.LIST_ORDERS_BY_NEXT_TOKEN:

            // Checks whether there was any error
            if(response.ListOrdersByNextTokenResponse) {
                // Check whether any data was returned
                if(response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].Orders[0].Order) {
                    orders = response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].Orders[0].Order;

                    // Each received order saves to database.
                    orders.forEach(function (order) {
                        if(order.OrderStatus[0]=== ORDER_STATUS.SHIPPED) {
                            // Check if there is no such order already
                            if(Order.find({amazonOrderId: order.AmazonOrderId[0], isArchive: false}).count() === 0) {
                                var orderId = insertOrder(order, orderRequestId);
                                let data = {
                                    amazonOrderId: order.AmazonOrderId[0],
                                    orderId: orderId,
                                    userId: userId,
                                    numberOfItems: order.NumberOfItemsShipped[0],
                                    orderShippedAt: order.LastUpdateDate[0]
                                };
                                insertOrderItemRequest(data)
                            }
                        }
                    });

                    // Checks whether there is more results to return
                    if(response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].NextToken) {

                        // Sets new object data to be send as request, based on callType and received nextToken value.
                        let options= setListOrdersOption(CALL_TYPE.LIST_ORDERS_HAS_NEXT, userId,
                            response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].NextToken);
                        // Reruns method mwsApiCall to get next portion of data
                        mwsApiCall(options, orderRequestId, userId);
                    }
                    else {

                        var lastUpdatedBefore= null;
                        if(response.ListOrdersByNextTokenResponse)//TODO- can be removed?
                            lastUpdatedBefore= response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].LastUpdatedBefore;
                        else
                            lastUpdatedBefore= response.ListOrdersResponse.ListOrdersResult[0].LastUpdatedBefore;
                        // Updates current OrderRequest by setting it as lastOrder, and sets lastUpdatedBefore field
                        // to value that was returned with the response.
                        // Next call will get orders starting from this date.
                        updateOrderRequest(orderRequestId, lastUpdatedBefore);
                        insertError(userId, response, 'Nie ma juz has next 2');//TODO-only for testing- remove
                    }
                } else {

                    // The request did not return any new order since previous request.
                    updateOrderRequest(orderRequestId, response.ListOrdersResponse.ListOrdersResult[0].LastUpdatedBefore);
                }
            } else {
                if(Order.find({orderRequestId: orderRequestId}).count() > 0 ) {
                    // Set last updated before taken from last order item with given orderId
                    var order= Order.find({orderRequestId: orderRequestId}, {sort: {createdAt: -1}}).fetch();
                    var lastOrder= order[0];
                    if (lastOrder)
                        updateOrderRequest(orderRequestId, lastOrder.order.LastUpdateDate);
                }
                MwsError.insert({
                    'createdAt': moment(new Date()).format(),
                    'content': response
                });
            }
            break;

        case ACTION_TYPE.LIST_ORDERS:

            if(response.ListOrdersResponse) {
                if(response.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order) {
                    orders = response.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order;

                    orders.forEach(function (order) {
                        if (order.OrderStatus[0] === ORDER_STATUS.SHIPPED) {
                            // Check if there is no such order already
                            if (Order.find({amazonOrderId: order.AmazonOrderId[0], isArchive: false}).count() === 0) {
                                var orderId = insertOrder(order, orderRequestId);
                                let data = {
                                    amazonOrderId: order.AmazonOrderId[0],
                                    orderId: orderId,
                                    userId: userId,
                                    numberOfItems: order.NumberOfItemsShipped[0],
                                    orderShippedAt: order.LastUpdateDate[0]
                                };
                                insertOrderItemRequest(data);
                            }
                        }
                    });

                    if (response.ListOrdersResponse.ListOrdersResult[0].NextToken) {

                        let options= setListOrdersOption(CALL_TYPE.LIST_ORDERS_HAS_NEXT, userId,
                            response.ListOrdersResponse.ListOrdersResult[0].NextToken);
                        mwsApiCall(options, orderRequestId, userId);
                    }
                    else {

                        var lastUpdatedBefore= null;
                        if(response.ListOrdersByNextTokenResponse)
                            lastUpdatedBefore= response.ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult[0].LastUpdatedBefore;
                        else
                            lastUpdatedBefore= response.ListOrdersResponse.ListOrdersResult[0].LastUpdatedBefore;

                        updateOrderRequest(orderRequestId, lastUpdatedBefore);
                    }
                } else {
                    updateOrderRequest(orderRequestId, response.ListOrdersResponse.ListOrdersResult[0].LastUpdatedBefore);
                }
            }else{
                if(Order.find({orderRequestId: orderRequestId}).count() > 0 ) {
                    // Set last updated before taken from last order item with given orderId
                    var order= Order.find({orderRequestId: orderRequestId}, {sort: {createdAt: -1}}).fetch();
                    var lastOrder= order[0];
                    if (lastOrder)
                        updateOrderRequest(orderRequestId, lastOrder.order.LastUpdateDate);
                }

                MwsError.insert({
                    'createdAt': moment(new Date()).format(),
                    'content': response,
                    'text': 'here will gooo!'
                });
            }
            break;

        case ACTION_TYPE.LIST_MATCHING_PRODUCTS:

            Product.insert({
                'createdAt': moment(new Date()).format(),
                'content': response,
                'amazonOrderId': orderRequestId //amazonOrderId
            });
            break;

        case ACTION_TYPE.LIST_ORDER_ITEMS:

            if(response){

                // If there was any error while requesting Amazon,than nothing will break.
                // It will be called again in 2 seconds.
                if(response.ErrorResponse) {
                    insertError(userId, response, 'Limit exceeded');//TODO-for testing olny, remove then
                }
                else if (response.ListOrderItemsResponse) {

                    var vals= response.ListOrderItemsResponse.ListOrderItemsResult[0].OrderItems;
                    if(vals) {
                        manageOrderItems(orderRequestId, userId, vals);
                    }
                }
            }else{
                insertError(userId, response);
            }
            break;

        case ACTION_TYPE.GET_PRODUCT_CATEGORIES_FOR_SKU:
            if(response) {
                if(response.ErrorResponse) {
                    insertError(userId, response, 'error');
                } else {
                    var vals= response.GetProductCategoriesForSKUResponse.GetProductCategoriesForSKUResult;
                    if(vals) {
                        if(vals[0])
                            manageProductsSKU(orderRequestId, vals[0].Self);
                    }
                }
            }else{
                insertError(userId, response);
            }
            break;
        case ACTION_TYPE.GET_PRODUCT_CATEGORIES_FOR_ASIN:

            if(response){

                Product.insert({
                    'createdAt': moment(new Date()).format(),
                    'content': response
                });
            }else{

                MwsError.insert({
                    'createdAt': moment(new Date()).format(),
                    'content': response
                });
            }
            break;

        case ACTION_TYPE.REQUEST_REPORT:

            var userData = Meteor.users.findOne({_id: userId}).profile;
            var reportRequest = ReportRequest.findOne({marketplaceId: userData.marketplaceId});

            if(response){
                if(response.RequestReportResponse) {
                    if (response.RequestReportResponse.RequestReportResult[0].ReportRequestInfo) {

                        Meteor.setTimeout(function() {
                            let options = setReportOption(CALL_TYPE.GET_REPORT_REQUEST_LIST, userId, null, null, response.RequestReportResponse.RequestReportResult[0].ReportRequestInfo[0].ReportRequestId[0], null);
                            mwsApiCall(options, response.RequestReportResponse.RequestReportResult[0].ReportRequestInfo[0].ReportRequestId[0], userId);
                        },10000);
                    }else{

                        updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                        insertError(userId, response, 'empty ReportRequestInfo');
                    }
                }else{

                    updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                    insertError(userId, response, 'empty RequestReportResponse');
                }
            }else{

                updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                insertError(userId, response, ACTION_TYPE.REQUEST_REPORT+' empty response');
            }
            break;
        case ACTION_TYPE.GET_REPORT_REQUEST_LIST:

            var userData = Meteor.users.findOne({_id: userId}).profile;
            var reportRequest = ReportRequest.findOne({marketplaceId: userData.marketplaceId});

            if(response){
                if(response.GetReportRequestListResponse) {
                    if(response.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0].GeneratedReportId){

                        let options = setReportOption(CALL_TYPE.GET_REPORT, userId, null, null, null, response.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0].GeneratedReportId[0]);
                        mwsApiCall(options, response.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0].GeneratedReportId[0], userId);
                    }else{

                        Meteor.setTimeout(function(){
                            let options = setReportOption(CALL_TYPE.GET_REPORT_REQUEST_LIST, userId, null, null, response.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0].ReportRequestId[0],null);
                            mwsApiCall(options, response.GetReportRequestListResponse.GetReportRequestListResult[0].ReportRequestInfo[0].ReportRequestId[0], userId);
                        },30000);
                    }
                }else{

                    updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                    insertError(userId, response, 'empty GetReportRequestListResult');
                }
            }else{

                updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                insertError(userId, response, ACTION_TYPE.GET_REPORT_REQUEST_LIST+' empty response');
            }
            break;

        case ACTION_TYPE.GET_REPORT:

            var userData = Meteor.users.findOne({_id: userId}).profile;
            var reportRequest = ReportRequest.findOne({marketplaceId: userData.marketplaceId});

            if(response){

                var nodes = xpath.select("//childNodes/..",response);
                console.log("Started products update: " + nodes.length);

                for(i=0; i<nodes.length; i++){
                    var node = xmlToJson(nodes[i]);
                    if((i%1000)==0){
                        console.log(i);
                    }
                    insertProduct(node, reportRequest._id, reportRequest.marketplaceId);
                }

                updateReportRequest(reportRequest._id, REPORT_STATUS.SUCCESS);
                console.log("Finished products update");
            }else{

                updateReportRequest(reportRequest._id, REPORT_STATUS.FAILED);
                insertError(userId, response, ACTION_TYPE.GET_REPORT+'empty response');
            }
            break;

        default:

            insertError(userId, response, 'empty response');
            break;
    }
};

insertError= function(userId, response, text) {
    MwsError.insert({
        'createdAt': moment(new Date()).format(),
        'content': response,
        'text': text
    });
};

updateReportRequest = function(reportRequestId, status){
    ReportRequest.update({_id: reportRequestId},{
        $set:{
            lastUpdateDate: moment(new Date()).format(),
            status: status
        }
    });
};