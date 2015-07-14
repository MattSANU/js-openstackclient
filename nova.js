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
	getLimits: function(onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/limits"
		});
	},

	/**
	 * Retrieve a list of available extensions to the Compute API.
	 */
	getExtensions: function(onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/extensions"
		});
	},

	getExtension: function(extensionName, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/extensions/" + extensionName
		});
	},

	getInstancesOptionalDetail: function(detailed, allTenants, params, onComplete) {
		if (allTenants) {
			// Undocumented parameter discovered using 'nova --debug list --all-tenants'
			params.all_tenants = 1;
		}
		return this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.url + "/servers" + (detailed ? "/detail" : "")
		});
	},

	getTenantInstances: function(params, onComplete) {
		return this.getInstancesOptionalDetail(false, false, params, onComplete);
	},

	getTenantInstancesDetailed: function(params, onComplete) {
		return this.getInstancesOptionalDetail(true, false, params, onComplete);
	},

	getAllInstances: function(params, onComplete) {
		return this.getInstancesOptionalDetail(false, true, params, onComplete);
	},

	getAllInstancesDetailed: function(params, onComplete) {
		return this.getInstancesOptionalDetail(true, true, params, onComplete);
	},

	getInstance: function(serverID, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/servers/" + serverID
		});
	},

	getInstanceIPs: function(serverID, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/servers/" + serverID + "/ips"
		});
	},

	getHosts: function(params, onComplete) {
		return this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.url + "/os-hosts"
		});
	},

	getHost: function(hostName, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/os-hosts/" + hostName
		});
	},

	getHypervisorsOptionalDetail: function(detailed, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/os-hypervisors" + (detailed ? "/detail" : "")
		});
	},

	getHypervisors: function(onComplete) {
		return this.getHypervisorsOptionalDetail(false, onComplete);
	},

	getHypervisorsDetailed: function(onComplete) {
		return this.getHypervisorsOptionalDetail(true, onComplete);
	},

	getHypervisorInstances: function(hypervisorHostname, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/os-hypervisors/" + hypervisorHostname + "/servers"
		});
	},

	getFlavorsOptionalDetail: function(onComplete, detailed, params) {
		return this.doRequest({
			data: params || {},
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.url + "/flavors" + (detailed ? "/detail" : "")
		});
	},
	getFlavoursOptionalDetail: function() {
		return this.getFlavorsOptionalDetail.apply(this, arguments);
	},

	getFlavors: function(onComplete, params) {
		return this.getFlavorsOptionalDetail(onComplete, false, params);
	},
	getFlavours: function() {
		return this.getFlavors.apply(this, arguments);
	},

	getFlavorsDetailed: function(onComplete, params) {
		return this.getFlavorsOptionalDetail(onComplete, true, params);
	},
	getFlavoursDetailed: function() {
		return this.getFlavorsDetailed.apply(this, arguments);
	},

	getFlavorByID: function(flavorID, onComplete) {
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/flavors/" + flavorID
		});
	},
	getFlavourByID: function() {
		return this.getFlavorByID.apply(this, arguments);
	},

	getResourceUseTime: function(onComplete, params) {
		return this.doRequest({
			data: params || {},
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.url + "/os-simple-tenant-usage"
		});
	}

});
