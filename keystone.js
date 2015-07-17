/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

// TODO: Restrict the scope of this
"use strict";

/**
 * Client for the Identity API ("Keystone")
 */
osclient.Keystone = function(params) {
	osclient.Client.apply(this, Array.prototype.slice.call(arguments));
	if (arguments.length === 0) {
		return; // Probably a subclass initialising its .prototype
	}
	$.extend(this, params);
	if (!this.authURL) {
		throw "No authURL supplied";
	}
	this.apiVersions = {};
};
osclient.Keystone.prototype = new osclient.Client();

$.extend(osclient.Keystone.prototype, {

	/**
	 * Retrieve a list of available versions of the Identity API.
	 */
	retrieveVersions: function(onComplete) {
		var keystone = this, promise;
		// TODO: Return a (cached) promise
		if ($.isEmptyObject(this.apiVersions)) {
			return this.doRequest({
				// jQuery interprets the HTTP status code 300 Multiple Choices as an error
				error: function(jqxhr, status, errorThrown) {
					// jqxhr.response is undefined in this error handler
					if (300 === jqxhr.status) {
						$(JSON.parse(jqxhr.responseText).versions.values).each(function(i, version) {
							keystone.apiVersions[version.id] = version;
						});
						onComplete();
					} else {
						throw "Failed to receive expected 300 response";
					}
				},
				url: this.authURL 
			});
		} else {
			onComplete();
		}
	},

	/**
	 * Authenticate against an OpenStack Keystone Identity v2.0 service, yielding an authentication token.
	 */
	authenticatev2_0: function() {
		var keystone = this, promise, authPayload = {
			"auth": {
				"passwordCredentials": {
					"username": this.username,
					"password": this.password,
				}
			}
		};
		if (!this.token && (!this.username || !this.password)) {
			throw "Neither username and password nor token supplied";
		}
		// The tenant name and ID must not both be supplied.
		if (this.tenantID) {
			authPayload.auth.tenantId = this.tenantID;
		} else if (this.tenantName) {
			authPayload.auth.tenantName = this.tenantName;
		}
		promise = this.doRequest({
			data: JSON.stringify(authPayload),
			method: "POST",
			processData: false,
			url: this.authURL + "/v2.0/tokens"
		}).promise();
		promise.done(function(response, jqxhr, status) {
			keystone.userID = response.access.user.id;
			keystone.token = response.access.token.id;
			if (response.access.token.tenant) {
				if (response.access.token.tenant.id) {
					keystone.tenantID = response.access.token.tenant.id;
				}
				if (response.access.token.tenant.name) {
					keystone.tenantName = response.access.token.tenant.name;
				}
			}
			if (!response.access.serviceCatalog) {
				keystone.catalog = response.access.serviceCatalog;
			}
		});
		return promise;
	},

	/**
	 * Authenticate against an OpenStack Keystone Identity v3 service, yielding an authentication token.
	 */
	authenticatev3: function() {
		var keystone = this, promise, authPayload = {
			"auth": {
				"identity": {
					"methods": [
						"password"
					],
					"password": {
						"user": {
							"password": this.password
						}
					}
				}
			}
		};
		if (this.username && this.domainID) {
			// The username is unique within the domain with the given ID
			authPayload.auth.identity.password.user.name = this.username;
			authPayload.auth.identity.password.user.domain = { "id": this.domainID };
		} else if (this.username && this.domainName) {
			// The username is unique within the named domain
			authPayload.auth.identity.password.user.name = this.username;
			authPayload.auth.identity.password.user.domain = { "name": this.domainName };
		} else if (this.userID) {
			// The user ID is globally unique
			authPayload.auth.identity.password.user.id = this.userID;
		} else {
			throw "Neither username and domainID nor userID supplied";
		}
		promise = this.doRequest({
			data: JSON.stringify(authPayload),
			method: "POST",
			processData: false,
			url: this.authURL + "/v3/auth/tokens"
		}).promise();
		promise.done(function(response, status, jqxhr) {
			var newToken = jqxhr.getResponseHeader("X-Subject-Token");
			if (newToken) {
				keystone.token = newToken;
			}
			if (response.token.catalog) {
				keystone.catalog = response.token.catalog;
			}
			if (response.token.user) {
				if (response.token.user.id) {
					keystone.userID = response.token.user.id;
				}
			}
		});
		return promise;
	},

	/**
	 * Authenticate against one of the available Identity Service API versions,
	 * if there is not already a valid authentication token.
	 *
	 * NOTE: In the 2.0 API, neither the tenant name nor tenant ID is required for authentication,
	 * but if neither of them is supplied, then the response contains an empty service catalog.
	 * Also, there does not seem to be a way in the 2.0 API to obtain the service catalog
	 * other than by authentication (though there is in the 3.0 API).
	 * Since the catalog is required, we must at some stage authorise with a tenant ID or name.
	 * But until we have authed, we don't know of any valid tenant IDs or names.
	 * So we auth without a tenant ID, find at least one valid tenant ID, then auth again with that.
	 */
	authenticate: function(onComplete) {
		// TODO: Return a (cached) promise
		var keystone = this;
		if (this.token) {
			onComplete();
		} else {
			return this.retrieveVersions(function() {
				if ("v3.0" in keystone.apiVersions) {
					keystone.authenticatev3().done(function() {
						keystone.findIdentityEndpoints();
						onComplete();
					});
				} else if ("v2.0" in keystone.apiVersions) {
					keystone.authenticatev2_0().done(function() {
						if (this.tenantID && this.catalog) {
							keystone.findIdentityEndpoints();
							onComplete();
						} else {
							// Use the token to obtain a list of accessible tenants
							keystone.getTenants().done(function(tenants) {
								if (!tenants.tenants.length) {
									throw "No accessible tenants";
								}
								// Choose the first tenant listed
								keystone.setTenantID(tenants.tenants[0].id);
								// Authenticate again, this time with a tenant ID, to obtain the service catalog
								keystone.authenticate2_0().done(function() {
									keystone.findIdentityEndpoints();
									onComplete();
								});
							});
						}
					});
				} else {
					throw "No supported Identity API version found";
				}
			});
		}
	},

	/**
	 * Retrieve the service catalog, which lists all accessible OpenStack services.
	 */
	retrieveCatalog: function(onComplete) {
		var keystone = this;
		return this.authenticate(function() {
			onComplete(keystone.catalog);
		});
	},

	/**
	 * Find the three endpoint URLs for the preferred version of the Identity service.
	 * The initial endpoint URL we were passed at instantiation time was for
	 * an unknown one of the three possible endpoints, for an unknown version of the Identity service,
	 * multiple versions of which may exist simultaneously, with arbitrary types and names.
	 * (By experiment, as of Icehouse, if there exist two services with the same type then
	 * corrupt catalogs are served, forcing one to have services types eg "identity" and "identityv3").
	 * For the version 3 API, this initial URL can be used for all subsequent requests.
	 * But for the version 2 API, since certain requests need to be sent to certain endpoints,
	 * we need to know all three of the service's endpoints.
	 * This requires finding the v2.0 Identity service in the catalog, but we cannot
	 * search by either name or type, as these are arbitrary and distinct strings.
	 * Instead, we search the catalog for the initial endpoint we were passed,
	 * assume that the service containing an endpoint with that URL is the Identity service,
	 * then remember that service's three endpoints.
	 */
	findIdentityEndpoints: function() {
		var
			keystone = this,
			findURL, // The URL to look for
			foundService // The service that has an endpoint with the found URL
		;
		if ("v3.0" in keystone.apiVersions) {
			findURL = keystone.apiVersions["v3.0"].links[0].href;
		} else if ("v2.0" in this.apiVersions) {
			findURL = keystone.apiVersions["v2.0"].links[0].href;
		} else {
			throw "No compatible version of the Identity API found";
		}
		findURL = findURL.replace(/\/$/, ''); // Strip trailing slash
		// Find this URL in the catalog
		$(this.catalog).each(function(i, service) {
			$(service.endpoints).each(function(i, endpoint) {
				$([ "url", "publicURL", "adminURL", "internalURL" ]).each(function(i, attribute) {
					if (attribute in endpoint) {
						var foundURL = endpoint[attribute].replace(/\/$/, ''); // Strip trailing slash
						if (foundURL === findURL) {
							foundService = service;
						}
					}
					return !foundService;
				});
				return !foundService;
			});
			return !foundService;
		});
		if (foundService) {
			$(foundService.endpoints).each(function(i, endpoint) {
				$([ "public", "admin", "internal" ]).each(function(i, endpointType) {
					if ((endpointType + "URL") in endpoint) {
						keystone[endpointType + "URL"] = endpoint[endpointType + "URL"];
					} else if ("url" in endpoint && endpoint.interface === endpointType) {
						keystone[endpointType + "URL"] = endpoint.url;
					}
				});
			});
			if (!keystone.publicURL || !keystone.adminURL || !keystone.internalURL) {
				throw "Missing public, admin or internal URL";
			}
		} else {
			throw "No service found with an endpoint URL equal to '" + findURL + "'";
		}
	},

	/**
	 * Find an endpoint in the service catalog matching all of the given constraints.
	 * Possible constraints include:
	 * serviceType: The type of OpenStack service, for example "compute"
	 * serviceName: The OpenStack project name, for example "nova"
	 * regionName: The name of an OpenStack region known to the OpenStack deployment, for example "RegionOne"
	 * endpointType: The endpoint type, for example "public"
	 * endpointID: The UUID of the endpoint.
	 */
	getEndpoint: function(params, onComplete) {
		var foundURL = undefined;
		return this.retrieveCatalog(function(catalog) {
			// TODO: version-specific matching based on version response and this catalog response.
			$(catalog).each(function(i, service) {
				if (
					   ( !("serviceType" in params) || service.type === params.serviceType )
					&& ( !("serviceName" in params) || service.name === params.serviceName )
				) {
					$(service.endpoints).each(function(i, endpoint) {
						// v2.0 API response
						if (
							   ( !("regionName" in params)   || endpoint.region === params.regionName)
							&& ( !("endpointID" in params)   || endpoint.id === params.endpointID)
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
						// v3 API response
						if (
							   ( !("regionName" in params)   || endpoint.region === params.regionName)
							&& ( !("endpointID" in params)   || endpoint.id === params.endpointID)
							&& ( !("endpointType" in params) || endpoint.interface === params.endpointType)
						) {
							foundURL = endpoint.url;
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
			onComplete(foundURL);
		});
	},

	/**
	 * Return the currently-in-use authentication token.
	 * Intended to be used to pass the token to other OpenStack services later.
	 */
	getToken: function() {
		return this.token;
	},

	/**
	 * Clear the current authentication token, so that another token
	 * will be generated when needed.
	 * Intended for use when the user or tenant has changed,
	 * which changes the catalog (since it contains tenant IDs),
	 * so authentication should be performed anew.
	 */
	clearToken: function() {
		this.token = null;
		this.catalog = null;
	},

	/**
	 * Set the tenant ID. This will cause retrieval of a new catalog when required.
	 */
	setTenantID: function(newTenantID) {
		this.tenantID = newTenantID;
		this.tenantName = null;
		this.clearToken();
	},
	setProjectID: function() {
		return this.setTenantID.apply(this, arguments);
	},

	/**
	 * Set the tenant name. This will cause retrieval of a new catalog when required.
	 */
	setTenantName: function(newTenantName) {
		this.tenantName = newTenantName;
		this.tenantID = null;
		this.clearToken();
	},
	setProjectName: function() {
		return this.setTenantName.apply(this, arguments);
	},

	/**
	 * Retrieve a list of tenants.
	 * This can be all tenants, or only those accessible via the currently-in-use credentials.
	 */
	getTenants: function(includeAll, maxResults, startAfter) {
		var promise, url, data = {};
		// TODO: Accept a generalised params object rather than positional arguments
		if ("v3.0" in this.apiVersions) {
			url = this.publicURL;
			if (includeAll) {
				url += "/projects";
				if (maxResults) {
					data.per_page = maxResults;
				}
				if (startAfter) {
					// FIXME: What is this 'page' parameter?
					// Docs say only: "Enables you to page through the list.".
					data.page = startAfter;
				}
			} else {
				url += "/users/" + this.userID + "/projects";
				// FIXME: Is there really no way to do paging? Docs say no, but could be wrong.
				if (maxResults || startAfter) {
					throw "Unsupported option";
				}
			}
		} else if ("v2.0" in this.apiVersions) {
			// The semantics of this request depend on the endpoint it was sent to
			url = (includeAll ? this.adminURL : this.publicURL) + "/tenants";
			if (maxResults !== undefined) {
				data.limit = maxResults;
			}
			if (startAfter !== undefined) {
				data.marker = startAfter;
			}
		} else {
			throw "No compatible Identity API";
		}
		promise = this.doRequest({
			data: data,
			headers: { "X-Auth-Token": this.token },
			processData: true,
			url: url
		}).promise();
		promise.done(function(response) {
			// Normalise the v2.0/v3 response
			if ("tenants" in response && !("projects" in response)) {
				response.projects = response.tenants;
			}
			if ("projects" in response && !("tenants" in response)) {
				response.tenants = response.projects;
			}
		});
		return promise;
	},
	getProjects: function() {
		return this.getTenants.apply(this, arguments);
	},

	/**
	 * Retrieve details of the user with the given ID.
	 */
	getUserByID: function(userID) {
		var url;
		if ("v3.0" in this.apiVersions) {
			url = this.publicURL;
		} else if ("v2.0" in this.apiVersions) {
			url = this.adminURL;
		} else {
			throw "No compatible Identity API";
		}
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			success: onComplete,
			url: url + '/users/' + userID
		}).promise();
	},

	/**
	 * Retrieve details of the given-named user.
	 */
	getUserByName: function(username) {
		var url;
		if ("v3.0" in this.apiVersions) {
			url = this.publicURL;
		} else if ("v2.0" in this.apiVersions) {
			url = this.adminURL;
		} else {
			throw "No compatible Identity API";
		}
		return this.doRequest({
			data: { name: username },
			headers: { "X-Auth-Token": this.token },
			processData: true,
			// FIXME: Does this request need to go to the 'admin' URL rather than the public one?
			url: this.publicURL + '/users'
		}).promise();
	},

	/**
	 * Retrieve details of the tenant with the given ID.
	 * In various places within OpenStack, this entity is also called a "project".
	 */
	getTenantByID: function(tenantID) {
		var url;
		if ("v3.0" in this.apiVersions) {
			url = this.publicURL + "/projects";
		} else if ("v2.0" in this.apiVersions) {
			url = this.adminURL + "/tenants";
		} else {
			throw "No compatible Identity API";
		}
		return this.doRequest({
			headers: { "X-Auth-Token": this.token },
			// FIXME: Does this request need to go to the 'admin' URL rather than the public one?
			url: url + "/" + tenantID
		}).promise();
	},
	getProjectByID: function() {
		return this.getTenantByID.apply(this, arguments);
	},

	/**
	 * Retrieve details of the given-named tenant.
	 * In various places within OpenStack, this entity is also called a "project".
	 */
	getTenantByName: function(tenantName) {
		var url;
		if ("v3.0" in this.apiVersions) {
			url = this.publicURL + "/projects";
		} else if ("v2.0" in this.apiVersions) {
			url = this.adminURL + "/tenants";
		} else {
			throw "No compatible Identity API";
		}
		return this.doRequest({
			data: { name: tenantName },
			headers: { "X-Auth-Token": this.token },
			processData: true,
			// FIXME: Does this request need to go to the 'admin' URL rather than the public one?
			url: url
		}).promise();
	},
	getProjectByName: function() {
		return this.getTenantByName.apply(this, arguments);
	}

	// TODO: The rest of the Identity API 2.0, Identity admin API 2.0 and Identity API 3

});
