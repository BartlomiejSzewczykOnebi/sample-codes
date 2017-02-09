import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import Loader from './../../../common/Loader.jsx';
import DoctorItem from './DoctorItem.jsx';

var DoctorsList = React.createClass({
    mixins: [ReactMeteorData],
    getInitialState() {
        return {
        }
    },
    getMeteorData() {
        return {
        }
    },
    render() {
        return <div className="doctors-table">
                {this.props.doctors.length === 0 ?
                    <div className="row text-center">
                        <h3><i>No doctors</i></h3>
                    </div>
                :<div className="table-head">
                    <span className="slide-arrow">Option</span>
                    <span className="fullName">Full name</span>
                    <span className="createdAt">Created at</span>
                    <span className="active">Verified email</span>
                    <span className="options">Options</span>
                    <span className="online">Online</span>
                </div>}
                {this.props.doctors.map((doctor)=> {
                    return <DoctorItem doctor={doctor} key= {doctor._id}/>
                })}
        </div>
    }
});

export default DoctorsList;
