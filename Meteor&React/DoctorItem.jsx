import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import Loader from './../../../common/Loader.jsx';

var DoctorItem = React.createClass({
    mixins: [ReactMeteorData],
    getInitialState() {
        return {
            detailsExpanded: false
        }
    },
    getMeteorData() {
        let doctor = this.props.doctor;
        let state = Meteor.subscribe("state", doctor.profile.idState);
        let city = Meteor.subscribe("city", doctor.profile.idCity);
        let zip = Meteor.subscribe("zip", doctor.profile.idZip);
        return {
            locationLoaded: state.ready() && city.ready() && zip.ready()
        }
    },
    seeDetails() {
        this.setState({
            detailsExpanded: !this.state.detailsExpanded
        })
    },
    render() {
        let doctor = this.props.doctor;
        let buttonActiveness = <button className="btn btn-success">ACTIVE</button>;
        let buttonOnline = <button className="btn btn-primary">ONLINE</button>;
        let state, city, zip;
        if(this.data.locationLoaded && doctor.profile.idState && doctor.profile.idCity && doctor.profile.idZip){
            state = State.findOne({_id: doctor.profile.idState}).name;
            city = City.findOne({_id: doctor.profile.idCity}).name;
            zip = Zip.findOne({_id: doctor.profile.idZip}).zipCode;
        }

        if(!doctor.profile.isActive)
            buttonActiveness = <button className="btn btn-danger">INACTIVE</button>;

        if(!doctor.profile.inNetwork)
            buttonOnline = <button className="btn btn-danger">OFFLINE</button>;

        const path= "/cfs/files/user-avatars/";
        let avatar="";
        if(doctor) {
            avatar = path+ doctor.profile.avatar;
        }

        return <div className="doctor-item">
                <div className="main-line">
                    <span className="slide-arrow"><a onClick ={this.seeDetails}>
                        <i className={this.state.detailsExpanded ? "fa fa-arrow-up" : "fa fa-arrow-down"}></i></a>
                    </span>
                    <span className="fullName">{doctor.profile.firstName} {doctor.profile.lastName}</span>
                    <span className="createdAt">{moment.utc(doctor.createdAt).format("MM/DD/YYYY hh:mm a")}</span>
                    <span className="active">{doctor.emails[0].verified ? "yes": "no"}</span>
                    <span className="options">{buttonActiveness}</span>
                    <span className="online">{buttonOnline}</span>
                </div>
            {this.state.detailsExpanded ?
                <div className="details-section">
                    <div className="row">
                        <div className="col-xs-3">
                            {doctor.profile.avatar === "" ?
                                <img className="profile-avatar" src="/AvatarDefault.png" /> :
                                <img className="profile-avatar" src={avatar} />
                            }
                        </div>
                        <div className="col-xs-3">
                            <span>e-mail: </span>
                            <span>{doctor.emails[0].address}</span>
                        </div>
                        <div className="col-xs-3">
                            <span>phone: </span>
                            <span>{doctor.profile.phoneNumber}</span>
                        </div>
                        <div className="col-xs-3">
                            <span>address: </span>
                            <p>{doctor.profile.address}</p>
                            {this.data.locationLoaded ?
                                <div>
                                    <p>{state}</p>
                                    <p>{city}, {zip}</p>
                                </div>
                                : ""}
                        </div>
                    </div>
                </div>
            :''}
        </div>
    }
});

export default DoctorItem;
