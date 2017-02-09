/**
 * Copyright (C) OneBi Sp. z o.o. All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Created by Bartlomiej Szewczyk, 2016-05-04
 */

// Sets options that will be send to request for order list depending on call type
setReportOption = (callType, userId, marketplaceId, reportType, reportRequestId, reportId) => {
    var userData= Meteor.users.findOne({_id: userId}).profile;

    var options = {
        method: METHOD_TYPE.POST,
        base: BASE_TYPE.EUROPE,
        endpoint: ENDPOINT_TYPE.EMPTY,
        params: {
            'SellerId': userData.sellerId,
            'MWSAuthToken': userData.mwsAuthorizationToken,
            'Version': VERSION_TYPE.GET_REPORT_LIST
        }
    };
    if( callType === CALL_TYPE.REQUEST_REPORT) {
        options.params.Action= ACTION_TYPE.REQUEST_REPORT;
        options.params['MarketplaceIdList.Id.1'] = marketplaceId;
        options.params.ReportType = reportType;

    } else if( callType === CALL_TYPE.GET_REPORT_REQUEST_LIST) {
        options.params.Action= ACTION_TYPE.GET_REPORT_REQUEST_LIST;
        options.params['ReportRequestIdList.Id.1'] = reportRequestId;

    } else if( callType === CALL_TYPE.GET_REPORT) {
        options.params.Action= ACTION_TYPE.GET_REPORT;
        options.params.ReportId= reportId;
        options.treeData = true;
    }
    return options;
};

insertProduct = (node, reportRequestId, marketplaceId) => {
    let productId=
        Product.insert({
            'createdAt': moment(new Date()).format(),
            'browseNodeId': node.browseNodeId.text,
            'browseNodeName': node.browseNodeName.text ,
            'browseNodeStoreContextName': node.browseNodeStoreContextName.text ,
            'browsePathById': node.browsePathById.text ,
            'browsePathByName': node.browsePathByName.text ,
            'productTypeDefinitions': node.productTypeDefinitions.text,
            'reportRequestId': reportRequestId,
            'marketplaceId': marketplaceId
        });
    return productId;
};

insertReportRequest = (ReportRequestInfo) => {
    let reportRequestId=
        ReportRequest.insert({
            'createdAt': moment(new Date()).format(),
            'reportRequest': ReportRequestInfo,
            'reportRequestId': ReportRequestInfo.reportRequestId
        });
    return reportRequestId;
};