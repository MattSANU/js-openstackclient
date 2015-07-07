/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

/**
 * Client for the Identity admin API ("Keystone")
 */
osclient.KeystoneAdmin = function() {
	osclient.Keystone.apply(this, Array.prototype.slice.call(arguments));
};
osclient.KeystoneAdmin.prototype = new osclient.Keystone();
$.extend(osclient.KeystoneAdmin.prototype, {

	/**
	 * Retrieve details of the given-named user.
	 */
	getUser: function(username, onComplete) {
		this.doRequest({
			data: { name: username },
			headers: { "X-Auth-Token": this.token },
			processData: true,
			success: onComplete,
			// FIXME: Does this request need to go to the 'admin' URL rather than the public one?
			url: this.publicURL + '/users'
		});
	}

	// TODO: The rest of the Identity admin API 2.0
});
