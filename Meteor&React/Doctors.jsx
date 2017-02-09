import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import Loader from './../../../common/Loader.jsx';
import Pagination from './../../../common/pagination/Pagination.jsx';
import {AutorunMixin} from 'meteor/universe:utilities-react';
import DoctorsList from './DoctorsList.jsx';
import DoctorsFilterPanel from './DoctorsFilterPanel.jsx';

var Doctors = React.createClass({
    mixins: [ReactMeteorData, AutorunMixin],
    getInitialState() {
        return {
            activePage: 0,
            totalCount: 0,
            offset:0,
            searchedName:null,
            idSpecialty: null,
            showActive: true,
            showOnline: false
        }
    },
    getMeteorData() {
        const doctors = Meteor.subscribe("doctorsForAdmin", this.state.offset, this.state.searchedName, this.state.idSpecialty,
        this.state.showActive, this.state.showOnline);

        return {
            doctorsLoaded: doctors.ready(),
            doctors: Meteor.users.find({'profile.userType': USER_TYPE.DOCTOR}).fetch()
        }
    },
    autorun() {
        this.setState({
            totalCount: Counts.get("totalDoctorsForAdmin")
        })
    },

    handlePageChange(pageNumber) {
        this.setState({
            activePage: pageNumber,
            offset: Math.ceil((pageNumber-1) * 10)
        });
    },
    setNameState(value) {

        this.setState({
            searchedName:value
        })
    },
    setSpecialtyState(value) {

        this.setState({
            idSpecialty:value
        })
    },
    changeActive() {
        this.setState({
            showActive: !this.state.showActive
        })
    },
    changeOnline() {
        this.setState({
            showOnline: !this.state.showOnline
        })
    },
    render() {
        return <div className="panel doctors-section">
            <div className="panel-body">
                <DoctorsFilterPanel
                    setNameState={this.setNameState}
                    setSpecialtyState={this.setSpecialtyState}
                    showActive= {this.state.showActive}
                    showOnline= {this.state.showOnline}
                    changeActive= {this.changeActive}
                    changeOnline= {this.changeOnline}/>
                <div className="doctors-list">
                    {this.data.doctorsLoaded   ?
                        <DoctorsList doctors={this.data.doctors}/>
                    :<div className="text-center spinner-loading">
                        <Loader/>
                        <h4>Loading doctors...</h4>
                    </div>}
                </div>
                <div className="row pagination-section">
                    <div className="text-center">
                        <Pagination
                            activePage={this.state.activePage}
                            itemsCountPerPage={10}
                            prevPageText="prev"
                            nextPageText="next"
                            totalItemsCount={this.state.totalCount}
                            pageRangeDisplayed={5}
                            onChange={this.handlePageChange}
                            />
                    </div>
                </div>
            </div>
        </div>
    }
});

export default Doctors;
