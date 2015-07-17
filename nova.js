/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

// TODO: Restrict the scope of this
"use strict";

/**
 * Client for the Compute API ("Nova")
 */
osclient.Nova = function(params) {
	osclient.Client.apply(this, Array.prototype.slice.call(arguments));
	this.url = params.publicURL;
	this.token = params.token;
	if (!this.url) {
		throw "No publicURL supplied";
	}
	if (!this.token) {
		throw "No authentication token supplied";
	}
};
osclient.Nova.prototype = new osclient.Client();

$.extend(osclient.Nova.prototype, {

	/**
	 * Retrieve rate and absolute resource limits for the given tenant ID.
	 */
	getLimits: function() {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/limits"
		}).promise();
	},

	/**
	 * Retrieve a list of available extensions to the Compute API.
	 */
	getExtensions: function() {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/extensions"
		}).promise();
	},

	getExtension: function(extensionName) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/extensions/" + extensionName
		}).promise();
	},

	getInstancesOptionalDetail: function(detailed, allTenants, params) {
		params = params || {};
		if (allTenants) {
			// Undocumented parameter discovered using 'nova --debug list --all-tenants'
			params.all_tenants = 1;
		}
		return this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/servers" + (detailed ? "/detail" : "")
		}).promise();
	},

	getTenantInstances: function(params) {
		return this.getInstancesOptionalDetail(false, false, params);
	},

	getTenantInstancesDetailed: function(params) {
		return this.getInstancesOptionalDetail(true, false, params);
	},

	getAllInstances: function(params) {
		return this.getInstancesOptionalDetail(false, true, params);
	},

	getAllInstancesDetailed: function(params) {
		return this.getInstancesOptionalDetail(true, true, params);
	},

	getInstance: function(serverID) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/servers/" + serverID
		});
	},

	getInstanceIPs: function(serverID) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/servers/" + serverID + "/ips"
		});
	},

	getHosts: function(params) {
		return this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/os-hosts"
		});
	},

	getHost: function(hostName) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hosts/" + hostName
		});
	},

	getHypervisorsOptionalDetail: function(detailed) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hypervisors" + (detailed ? "/detail" : "")
		}).promise();
	},

	getHypervisors: function() {
		return this.getHypervisorsOptionalDetail(false);
	},

	getHypervisorsDetailed: function() {
		return this.getHypervisorsOptionalDetail(true);
	},

	getHypervisorInstances: function(hypervisorHostname) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hypervisors/" + hypervisorHostname + "/servers"
		}).promise();
	},

	getFlavorsOptionalDetail: function(detailed, params) {
		return this.doRequest({
			data: params || {},
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/flavors" + (detailed ? "/detail" : "")
		}).promise();
	},
	getFlavoursOptionalDetail: function() {
		return this.getFlavorsOptionalDetail.apply(this, arguments);
	},

	getFlavors: function(params) {
		return this.getFlavorsOptionalDetail(false, params);
	},
	getFlavours: function() {
		return this.getFlavors.apply(this, arguments);
	},

	getFlavorsDetailed: function(params) {
		return this.getFlavorsOptionalDetail(true, params);
	},
	getFlavoursDetailed: function() {
		return this.getFlavorsDetailed.apply(this, arguments);
	},

	getFlavorByID: function(flavorID) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/flavors/" + flavorID
		}).promise();
	},
	getFlavourByID: function() {
		return this.getFlavorByID.apply(this, arguments);
	},

	getResourceUseTime: function(params) {
		return this.doRequest({
			data: params || {},
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/os-simple-tenant-usage"
		}).promise();
	}

});
