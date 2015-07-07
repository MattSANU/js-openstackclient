/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

/**
 * Client for the Identity API ("Keystone")
 */
osclient.Keystone = function(params) {
	osclient.Client.apply(this, Array.prototype.slice.call(arguments));
	if (arguments.length === 0) {
		return; // Probably a subclass initialising its .prototype
	}
	this.authURL = params.authURL;
	this.password = params.password;
	this.username = params.username;
	this.tenantName = params.tenantName;
	this.tenantID = params.tenantID;
	this.token = params.token;
	if (!this.authURL) {
		throw "No authURL supplied";
	}
	// NOTE: Neither the tenant name nor tenant ID is required for authentication,
	// but if neither is supplied, the response contains an empty service catalog.
	// Also, there does not seem to be a way in the 2.0 API to obtain the service catalog
	// other than by authentication (though there is in the 3.0 API).
	if (!this.token && (!this.username || !this.password)) {
		throw "Neither username and password nor token supplied";
	}
};
osclient.Keystone.prototype = new osclient.Client();

// TODO: Support for Identity API versions other than 2.0
$.extend(osclient.Keystone.prototype, {

	/**
	 * Authenticate against an OpenStack Keystone service, yielding an authentication token.
	 */
	authenticate: function(onComplete) {
		var keystone = this, authPayload = {
			"auth": {
				"passwordCredentials": {
					"username": this.username,
					"password": this.password,
				}
			}
		};
		// The tenant name and ID must not both be supplied.
		if (this.tenantID) {
			authPayload.auth.tenantId = this.tenantID;
		} else if (this.tenantName) {
			authPayload.auth.tenantName = this.tenantName;
		}
		this.doRequest({
			data: JSON.stringify(authPayload),
			method: "POST",
			processData: false,
			success: function(response, jqxhr, status) {
				keystone.token = response.access.token.id;
				keystone.catalog = response.access.serviceCatalog;
				// Not all operations can be performed via all URLs
				keystone.publicURL = keystone.getEndpoint({ serviceType: "identity", endpointType: "public" });
				keystone.adminURL = keystone.getEndpoint({ serviceType: "identity", endpointType: "admin" });
				onComplete();
			},
			url: this.authURL + "/v2.0/tokens"
		});
	},

	/**
	 * Return the currently-in-use authentication token.
	 */
	getToken: function() {
		return this.token;
	},

	/**
	 * Return the service catalog, which must have been previously retrieved
	 * during authentication to Keystone.
	 */
	getCatalog: function() {
		return this.catalog;
	},

	/**
	 * Find an endpoint in the service catalog matching all of the given constraints.
	 * Possible constraints include:
	 * serviceType: The type of OpenStack service, for example "compute"
	 * serviceName: The OpenStack project name, for example "nova"
	 * regionName: The name of an OpenStack region known to the OpenStack deployment, for example "region1"
	 * endpointType: The endpoint type, for example "public"
	 * endpointID: The UUID of the endpoint.
	 */
	getEndpoint: function(params) {
		var foundURL = undefined;
		$(this.catalog).each(function(i, service) {
			if (
				( !("serviceType" in params) || service.type === params.serviceType )
				&& ( !("serviceName" in params) || service.name === params.serviceName )
			) {
				$(service.endpoints).each(function(i, endpoint) {
					if (
						( !("regionName" in params) || endpoint.region === params.regionName)
						&& ( !("endpointId" in params) || endpoint.id === params.endpointId)
						&& ( !("endpointType" in params) || (params.endpointType + "URL") in endpoint)
					) {
						if ("endpointType" in params) {
							foundURL = endpoint[params.endpointType + "URL"];
						} else if ("publicURL" in endpoint) {
							foundURL = endpoint.publicURL;
						} else if ("adminURL" in endpoint) {
							foundURL = endpoint.adminURL;
						} else if ("internalURL" in endpoint) {
							foundURL = endpoint.internalURL;
						}
					}
					if (foundURL !== undefined) {
						return false; // Terminate enumeration
					}
				});
				if (foundURL !== undefined) {
					return false; // Terminate enumeration
				}
			}
		});
		return foundURL;
	},

	/**
	 * Retrieve a list of all tenants accessible by the currently-in-use authentication token.
	 */
	getTenants: function(onComplete, maxResults, startAfter) {
		var data = {};
		if (maxResults !== undefined) {
			data.limit = maxResults;
		}
		if (startAfter !== undefined) {
			data.marker = startAfter;
		}
		this.doRequest({
			data: data,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			url: this.authURL + '/v2.0/tenants'
		});
	}

});
