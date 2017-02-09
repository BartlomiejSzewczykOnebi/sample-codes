import React from 'react';
import {mount} from 'react-mounter';

import {DashboardLayout} from '../layouts/DashboardLayout.jsx';
import Dashboard from './../templates/admin/Dashboard.jsx';

import NavbarTopDashboard from '../composers/navbar-top-dashboard.js';
import SidebarDashboard from '../composers/sidebar-dashboard.js';

import AppSettings from './../templates/admin/settings/technical/AppSettings.jsx';
import AppDesign from './../templates/admin/settings/UI/Design.jsx';
import Patients from '../templates/admin/users/patients/Patients.jsx';
import Doctors from './../templates/admin/users/doctors/Doctors.jsx';
import StepContainer from './../templates/patient/appointment-steps/StepContainer.jsx'

FlowRouter.route('/admin_dashboard', {
    triggersEnter: [checkLoggedIn],
    name: 'adminDashboard',
    action() {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( <Dashboard />)
        })
    }
});

FlowRouter.route('/app_settings', {
    triggersEnter: [checkLoggedIn],
    name: 'appSettings',
    action() {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( <AppSettings />)
        })
    }
});

FlowRouter.route('/app_design', {
    triggersEnter: [checkLoggedIn],
    name: 'appDesign',
    action() {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( <AppDesign />)
        })
    }
});

FlowRouter.route('/doctors', {
    triggersEnter: [checkLoggedIn],
    name: 'doctors',
    action() {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( <Doctors />)
        })
    }
});

FlowRouter.route('/patients', {
    triggersEnter: [checkLoggedIn],
    name: 'patients',
    action() {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( <Patients />)
        })
    }
});

FlowRouter.route('/add_visit/:id', {
    triggersEnter: [checkLoggedIn],
    name: 'add_visit',
    action(params) {
        mount(DashboardLayout, {
            navbar: ( <NavbarTopDashboard/>),
            sidebar: ( <SidebarDashboard/>),
            content: ( < StepContainer />)
        })
    }
});

function checkLoggedIn (ctx, redirect) {
    if (!Meteor.userId()) {
        redirect('/login');
    }

    if(Roles.userIsInRole(Meteor.userId(), [USER_TYPE.DOCTOR], 'role')===true)
        redirect('/my_appointments');

    if(Roles.userIsInRole(Meteor.userId(), [USER_TYPE.PATIENT], 'role')===true)
        redirect('/my_visits');
}