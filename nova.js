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
	this.cacheExtensions = {};
	this.instanceCacheByID = {};
	this.hostCache = {};
	this.flavourCacheByID = {};
};
osclient.Nova.prototype = new osclient.Client();

$.extend(osclient.Nova.prototype, {

	/**
	 * Retrieve rate and absolute resource limits for the given tenant ID.
	 */
	getLimits: function() {
		// TODO: Cache these requests
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/limits"
		}).promise();
	},

	/**
	 * Retrieve a list of available extensions to the Compute API.
	 */
	getExtensions: function() {
		if (!this.cacheExtensions) {
			this.cacheExtensions = this.doRequest({
				headers: { "X-Auth-Token": this.token },
				url: this.url + "/extensions"
			}).promise();
		}
		return this.cacheExtensions;
	},

	getExtension: function(extensionName) {
		// TODO: Use a cache unified with that from getExtensions above to cache this call
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/extensions/" + extensionName
		}).promise();
	},

	getInstancesOptionalDetail: function(detailed, allTenants, params) {
		var deferred = $.Deferred();
		// TODO: Cache these requests
		params = params || {};
		if (allTenants) {
			// Undocumented parameter discovered using 'nova --debug list --all-tenants'
			params.all_tenants = 1;
		}
		this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/servers" + (detailed ? "/detail" : "")
		}).done(function(response) {
			deferred.resolve(response.servers);
		});
		return deferred.promise();
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

	getInstance: function(instanceID) {
		if (!this.instanceCacheByID[instanceID]) {
			this.instanceCacheByID[instanceID] = this.doRequest({
				headers: { "X-Auth-Token": this.token },
				url: this.url + "/servers/" + instanceID
			}).promise();
		}
		return this.instanceCacheByID[instanceID];
	},

	getInstanceIPs: function(serverID) {
		// TODO: Cache this call, with a way to disable caching on user demand
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/servers/" + serverID + "/ips"
		}).promise();
	},

	getHosts: function(params) {
		if (!this.hostCache) {
			this.hostCache = this.doRequest({
				data: params,
				headers: { "X-Auth-Token": this.token },
				processData: true,
				url: this.url + "/os-hosts"
			}).promise();
		}
		return this.hostCache;
	},

	getHost: function(hostName) {
		// TODO: Use a cache unified with that from getHosts above to cache this call
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hosts/" + hostName
		}).promise();
	},

	getHypervisorsOptionalDetail: function(detailed) {
		var deferred = $.Deferred();
		// TODO: Cache this call, with a way to disable caching on user demand
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hypervisors" + (detailed ? "/detail" : "")
		}).done(function(response) {
			deferred.resolve(response.hypervisors);
		});
		return deferred.promise();
	},

	getHypervisors: function() {
		return this.getHypervisorsOptionalDetail(false);
	},

	getHypervisorsDetailed: function() {
		return this.getHypervisorsOptionalDetail(true);
	},

	getHypervisorInstances: function(hypervisorHostname) {
		// TODO: Cache this call, with a way to disable caching on user demand
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			url: this.url + "/os-hypervisors/" + hypervisorHostname + "/servers"
		}).promise();
	},

	getFlavorsOptionalDetail: function(detailed, params) {
		var deferred = $.Deferred();
		// TODO: Cache this call, with a way to disable caching on user demand
		this.doRequest({
			data: params || {},
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: this.url + "/flavors" + (detailed ? "/detail" : "")
		}).done(function(response) {
			deferred.resolve(response.flavors);
		});
		return deferred.promise();
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

	getFlavorByID: function(flavourID) {
		var deferred;
		if (!this.flavourCacheByID[flavourID]) {
			deferred = $.Deferred();
			this.doRequest({
				headers: { "X-Auth-Token": this.token },
				url: this.url + "/flavors/" + flavourID
			}).done(function(response) {
				deferred.resolve(response.flavor);
			});
			this.flavourCacheByID[flavourID] = deferred.promise();
		}
		return this.flavourCacheByID[flavourID];
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
