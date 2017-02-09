/**
 * Copyright (C) OneBi Sp. z o.o. All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Created by Bartlomiej Szewczyk, 2016-06-13
 */
import moment from 'moment-timezone';

Meteor.publishTransformed('customScheduleByDoctorId', function (endRange) {//For doctor calendar
    if (!this.userId)
        throw new Meteor.Error(403, "Unauthorized access!");


    var me = Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.DOCTOR, 'emails.0.verified': true});
    if (!me)
        throw new Meteor.Error(403, 'Unauthorized access');

    let timeZone = getUserTimeZone(me);

    if(!!endRange) {

        let utcDate = moment.tz(endRange, timeZone).format();
        let endDate = moment.utc(moment.tz(utcDate, timeZone).format()).format();

        let startDate  = moment.utc(moment(endDate).subtract(7, 'days').format()).format();

        return CustomSchedule.find({
            idDoctor: this.userId,
            $and: [
                {start:{$gte: startDate}},
                {start:{$lt: endDate}}
            ]
        }, {sort:{start:1}}).serverTransform({

            start: function (doc) {
                return moment(doc.start).tz(timeZone).format()
            },
            end: function (doc) {
                return moment(doc.end).tz(timeZone).format()
            },
            startTime: function (doc) {
                return moment(doc.start).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss");//moment(doc.start).tz(timeZone).format("hh:mm a")
            },
            endTime: function (doc) {
                return moment(doc.end).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss")
            },
            startDate: function (doc) {
                return new Date(doc.start)
            }
        });
    }
    return [];

});


Meteor.publishTransformed('customScheduleByDoctor', function (idDoctor, date, currentSlotsNumber, patientId) {//For patient to display doctors list

    if (!this.userId)
        throw new Meteor.Error(403, "Unauthorized access!");

    let me = null;
    if(this.userId === patientId)
        me = Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.PATIENT, 'emails.0.verified': true});
    else if(patientId != "" && patientId != null && patientId != undefined)
        me = Meteor.users.findOne({_id: patientId, 'profile.userType': USER_TYPE.PATIENT, 'emails.0.verified': true});

    let admin = Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.ADMIN});
    if (!me && !admin)
        throw new Meteor.Error(403, 'Unauthorized access');

    if(!hasPatientAccess(me._id)) {
        throw new Meteor.Error(403, "Unauthorized access. You have to fill in all required fields in profile");
    }

    let timeZone = null;

    if (!!me.profile.temporaryTimeZone)
        timeZone = me.profile.temporaryTimeZone;
    else {
        if (me.profile.idTimeZone)
            timeZone = TimeZone.findOne(me.profile.idTimeZone).timeZoneString;
        else {
            timeZone = "America/Detroit";
        }
    }

    let dateGot = date.date;
    let utcDate = moment.tz(dateGot, timeZone).format();
    let beginDate = moment.utc(moment.tz(utcDate, timeZone).format()).format();
    let endDate  = moment.utc(moment(beginDate).add(24, 'hours').format()).format();
    let timeNow  = moment.utc().format();

    Counts.publish(this, 'customScheduleCount' + idDoctor, CustomSchedule.find({
        idDoctor: idDoctor,

        $and: [
            {$and:[{start:{$gte: beginDate}}, {start:{$gte: timeNow}}]},
            {start:{$lt: endDate}}
        ]
    }), {noReady: true});

    return CustomSchedule.find({
            idDoctor: idDoctor,
            $and: [
                {$and:[{start:{$gte: beginDate}}, {start:{$gte: timeNow}}]},
                {start:{$lt: endDate}}
            ]
        }
        , {$sort: {start: 1}}).serverTransform({
            start: function (doc) {
                return moment(doc.start).tz(timeZone).format()
            },
            end: function (doc) {
                return moment(doc.end).tz(timeZone).format()
            },
            startTime: function (doc) {
                return moment(doc.start).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss");
            },
            endTime: function (doc) {
                return moment(doc.end).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss")
            },
            startDate: function (doc) {
                return new Date(doc.start)
            }
    });

});

Meteor.publishTransformed('selectedSchedule', function(idSchedule) {

    if (!this.userId)
        throw new Meteor.Error(403, "Unauthorized access!");

    let me = Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.PATIENT, 'emails.0.verified': true});

    if(!me)
        throw new Meteor.Error(403, "Unauthorized access!");

    if(!hasPatientAccess(this.userId)) {
        throw new Meteor.Error(403, "Unauthorized access. You have to fill in all required fields in profile");
    }

    let timeZone = getUserTimeZone(me);

    let schedule = CustomSchedule.findOne(idSchedule);

    if(!schedule)
        return [];

    return CustomSchedule.find(idSchedule, {fields: {start: 1, end: 1, _id: 1}}).serverTransform({

        start: function (doc) {
            return moment(doc.start).tz(timeZone).format()
        },
        end: function (doc) {
            return moment(doc.end).tz(timeZone).format()
        },
        startTime: function (doc) {
            return moment(doc.start).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss");
        },
        endTime: function (doc) {
            return moment(doc.end).tz(timeZone).format("YYYY-MM-DDTHH:mm:ss")
        },
        startDate: function (doc) {
            return new Date(doc.start)
        }
    });
});