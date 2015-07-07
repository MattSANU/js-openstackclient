/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

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
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/limits"
		});
	},

	/**
	 * Retrieve a list of available extensions to the Compute API.
	 */
	getExtensions: function(onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/extensions"
		});
	},

	getExtension: function(extensionName, onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/extensions/" + extensionName
		});
	},

	getInstancesOptionalDetail: function(detailed, params, onComplete) {
		this.doRequest({
			data: params,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.url + "/servers" + (detailed ? "/detail" : "")
		});
	},

	getInstances: function(params, onComplete) {
		return this.getInstancesOptionalDetail(false, params, onComplete);
	},

	getInstancesDetailed: function(params, onComplete) {
		return this.getInstancesOptionalDetail(true, params, onComplete);
	},

	getInstance: function(serverID, onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/servers/" + serverID
		});
	},

	getInstanceIPs: function(serverID, onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/servers/" + serverID + "/ips"
		});
	},

	getHypervisors: function(onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/os-hypervisors"
		});
	},

	getHypervisorInstances: function(hypervisorHostname, onComplete) {
		this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: this.url + "/os-hypervisors/" + hypervisorHostname + "/servers"
		});
	}

});
