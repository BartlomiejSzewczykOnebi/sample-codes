/**
 * Copyright (C) OneBi Sp. z o.o. All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Created by Bartlomiej Szewczyk, 16.01.2017.
 */

Meteor.publish("patientFamilyMembers", function(userId) {

    if (!this.userId)
        throw new Meteor.Error(403, "Unauthorized access!");

    if(userId === "" || userId === undefined || userId === null)
        userId = this.userId;

    if (this.userId === userId){
        var user= Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.PATIENT});
        var familyMembers = FamilyMembers.find({idPatient: this.userId});

        if(!familyMembers)
            return null;

        if(!user)
            throw new Meteor.Error(403, "Unauthorized access!");

        return familyMembers;
    }else{
        var user= Meteor.users.findOne({_id: this.userId, 'profile.userType': USER_TYPE.ADMIN});
        var familyMembers = FamilyMembers.find({idPatient: userId});

        if(!familyMembers)
            return null;

        if(!user)
            throw new Meteor.Error(403, "Unauthorized access!");

        return familyMembers;
    }



});

Meteor.publish("familyMemberById", function(familyMemberId) {
    if (!this.userId)
        throw new Meteor.Error(403, "Unauthorized access!");

    var familyMembers = FamilyMembers.find({_id: familyMemberId});

    if(!familyMembers)
        return null;

    return familyMembers;

});