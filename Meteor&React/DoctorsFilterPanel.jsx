import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import Loader from './../../../common/Loader.jsx';
import ReactSelectize from "react-selectize";
SimpleSelect = ReactSelectize.SimpleSelect;


var DoctorsFilterPanel = React.createClass({
    mixins: [ReactMeteorData],
    getInitialState() {
        return {
            selectedSpecialty: null
        }
    },
    getMeteorData() {
        const specialties = Meteor.subscribe("specialties");
        return {
            specialtiesLoaded: specialties.ready()
        }
    },
    onChangeName: _.throttle(function (event) {
        event.persist();

        this.props.setNameState(ReactDOM.findDOMNode(this.refs.nameSearcher).value);
    }, 200),
    changeSpecialty(item) {

        this.setState({
            selectedSpecialty: item
        });
        this.props.setSpecialtyState(!!item ? item.key : null);
    },
    changeShowActive() {
        this.props.changeActive();
    },
    changeShowOnline() {
        this.props.changeOnline();
    },
    render() {

        return <div className="filter-panel doc-filter-panel text-center col-xs-12 col-md-8 col-md-offset-2">
            <div className="row">
                <div className="col-xs-12 col-md-3 text-right">
                    <label>Search doctor by last name:</label>
                </div>
                <div className="col-xs-12 col-md-3">
                    <div className="form-group">
                        <input type="text" className="form-control" onChange={this.onChangeName} ref= "nameSearcher"></input>
                    </div>
                </div>
                <div className="col-xs-12 col-md-3 text-right">
                    <label>Choose speciality:</label>
                </div>
                <div className="col-xs-12 col-md-3">
                    <div className="form-group">
                        {this.data.specialtiesLoaded ?
                            <SimpleSelect
                                options = {Specialty.find().fetch().map((specialty)=> {
                                    return {label: specialty.specialty, value: specialty.specialty, key: specialty._id }
                                })}
                                placeholder= "Specialty"
                                value= {this.state.selectedSpecialty}
                                onValueChange = {this.changeSpecialty}>
                            </SimpleSelect>
                        :<Loader/>}
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col-xs-6 col-md-3 text-right">
                    <label>Show only active doctors</label>
                </div>
                <div className="col-xs-6 col-md-3 text-right">
                    <div className="form-group">
                        <div className="btn-radio-group">
                            <button className={this.props.showActive=== true ? "btn btn-radio btn-radio-active" : "btn btn-radio"} onClick={this.changeShowActive}>Yes</button>
                            <button className={this.props.showActive=== false ? "btn btn-radio btn-radio-active" : "btn btn-radio"} onClick={this.changeShowActive}>No</button>
                        </div>
                    </div>
                </div>
                <div className="col-xs-6 col-md-3 text-right">
                    <label>Show only online doctors</label>
                </div>
                <div className="col-xs-6 col-md-3 text-right">
                    <div className="form-group">
                        <div className="btn-radio-group">
                            <button className={this.props.showOnline=== true ? "btn btn-radio btn-radio-active" : "btn btn-radio"} onClick={this.changeShowOnline}>Yes</button>
                            <button className={this.props.showOnline=== false ? "btn btn-radio btn-radio-active" : "btn btn-radio"} onClick={this.changeShowOnline}>No</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    }
});


export default DoctorsFilterPanel;