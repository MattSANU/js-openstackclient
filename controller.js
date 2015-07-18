/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

// TODO: Restrict the scope of this
"use strict";

var keystone, nova;

function populateTenantSelector(tenants) {
	var target = $("#tenantSelect").empty();
	$(tenants).each(function(i, tenant) {
		target.append(
			$("<option>")
			.attr({ label: tenant.name, value: tenant.id })
			.text(tenant.description ? (tenant.description + " (" + tenant.name + ")") : tenant.name)
		);
	});
}

function populateCatalog(catalog) {
	$("#catalog table").DataTable().clear().rows.add(catalog).draw();
}

function populateTenants(tenants) {
	$("#tenants table").DataTable().clear().rows.add(tenants).draw();
}

function addDownloadLinks() {
	$("table.dataTable").each(function() {
		var downloadLink = $("<a>").append("Export to CSV");
		$.fn.toCSV.makeDownloadLink(downloadLink, $(this), "export");
		$(this).parent().append(downloadLink);
	});
}

function populateInstances(instances) {
	$(instances).each(function(i, instance) {
		var addresses = [];
		$.each(instance.addresses, function(j, network) {
			$(network).each(function(k, port) {
				addresses.push(port.addr);
			});
		});
		instance.addressList = addresses.join(", ");
	});
	$("#instances table").DataTable().clear().rows.add(instances).draw();
	retrieveTenantResourceUse(keystone, instances, function(tenantResourceUse) {
		makePieChartDataTenantResource("vcpus", tenantResourceUse, function(pieChartData) {
			var dest = $("#pieChartTenantVCPUs");
			makePieChart(dest, {
				"header": {
					"title": {
						"text": "vCPU Use"
					},
					"subtitle": {
						"text": "By Tenant"
					}
				},
				"size": {
					"canvasHeight": dest.height(),
					"canvasWidth": dest.width()
				},
				tooltips: {
					"string": "{label}: {value} vCPUs ({percentage}%)"
				},
				"data": {
					content: pieChartData
				}
			});
		});
		makePieChartDataTenantResource("ram", tenantResourceUse, function(pieChartData) {
			var dest = $("#pieChartTenantMemory");
			makePieChart(dest, {
				"header": {
					"title": {
						"text": "Memory Use"
					},
					"subtitle": {
						"text": "By Tenant"
					}
				},
				"size": {
					"canvasHeight": dest.height(),
					"canvasWidth": dest.width()
				},
				tooltips: {
					"string": "{label}: {value} MB ({percentage}%)"
				},
				"data": {
					content: pieChartData
				}
			});
		});
		makePieChartDataTenantResource("disk", tenantResourceUse, function(pieChartData) {
			var dest = $("#pieChartTenantLocalDisk");
			makePieChart(dest, {
				"header": {
					"title": {
						"text": "Local Disk Use"
					},
					"subtitle": {
						"text": "By Tenant"
					}
				},
				"size": {
					"canvasHeight": dest.height(),
					"canvasWidth": dest.width()
				},
				tooltips: {
					"string": "{label}: {value} GB ({percentage}%)"
				},
				"data": {
					content: pieChartData
				}
			});
		});
	});
}

function populateHypervisors(hypervisors) {
	$("#hypervisors table").DataTable().clear().rows.add(hypervisors).draw();
}

function onAuthenticated(catalog) {
	populateCatalog(catalog);
	keystone.getTenants(false).done(populateTenantSelector);
	keystone.getTenants(true).done(populateTenants);
	// Use the catalog to connect to Nova
	keystone.getEndpoint({
		serviceType: "compute",
		endpointType: "public"
	}).done(function(novaURL) {
		nova = new osclient.Nova({
			publicURL: novaURL,
			token: keystone.getToken()
		});
		// Use Nova to retrieve a list of instances
		nova.getAllInstancesDetailed().done(populateInstances);
		$(".pieChart").on("segmentClicked.d3pie", function(event, data) {
			// TODO
			console.log("Pie segment for tenant " + data.data.id + " " + (data.expanded ? "un" : "") + "expanded");
		});
		// Use Nova to retrieve a list of hypervisors
		nova.getHypervisorsDetailed().done(populateHypervisors);
		retrieveResourceUse(nova, function(resourceUse) {
			makePieChartDataResource('vcpus', resourceUse, function(pieChartData) {
				var dest = $("#pieChartVCPUs");
				makePieChart(dest, {
					"header": {
						"title": {
							"text": "vCPU Use"
						},
						"subtitle": {
							"text": "Total"
						}
					},
					"size": {
						"canvasHeight": dest.height(),
						"canvasWidth": dest.width()
					},
					tooltips: {
						"string": "{label}: {value} vCPUs ({percentage}%)"
					},
					"data": {
						content: pieChartData
					}
				});
			});
			makePieChartDataResource('ram', resourceUse, function(pieChartData) {
				var dest = $("#pieChartMemory");
				makePieChart(dest, {
					"header": {
						"title": {
							"text": "Memory Use"
						},
						"subtitle": {
							"text": "Total"
						}
					},
					"size": {
						"canvasHeight": dest.height(),
						"canvasWidth": dest.width()
					},
					tooltips: {
						"string": "{label}: {value} MB ({percentage}%)"
					},
					"data": {
						content: pieChartData
					}
				});
			});
			makePieChartDataResource('disk', resourceUse, function(pieChartData) {
				var dest = $("#pieChartLocalDisk");
				makePieChart(dest, {
					"header": {
						"title": {
							"text": "Local Disk Use"
						},
						"subtitle": {
							"text": "Total"
						}
					},
					"size": {
						"canvasHeight": dest.height(),
						"canvasWidth": dest.width()
					},
					tooltips: {
						"string": "{label}: {value} GB ({percentage}%)"
					},
					"data": {
						content: pieChartData
					}
				});
			});
		});
	});
	addDownloadLinks();
};

(function($) {
	$(function() {
		var tenantSelect = $("#tenantSelect");
		$("button, input[type=button], input[type=checkbox]").button();
		$('input[type=text]').addClass("ui-widget ui-widget-content ui-corner-all");
		$('select').menu();
		$('textfield.numeric, input.numeric').spinner();
		$("#tenants table").DataTable({
			columns: [
				{ "data": "name", title: "Name" },
				{ "data": "description", title: "Description" },
				{ "data": "enabled", title: "Enabled" }
			]
		});
		$("#catalog table").DataTable({
			columns: [
				{ "data": "type", title: "Type" },
				{ "data": "name", title: "Name" }
			]
		});
		$("#instances table").DataTable({
			columns: [
				{ "data": "name", title: "Name" },
				{ "data": "status", title: "Status" },
				{ "data": "addressList", title: "IP Addresses" },
				{ "data": "user_id", title: "User ID" },
				{ "data": "tenant_id", title: "Tenant ID" }
				// { "data": , title: "" },
			]
		});
		$("#hypervisors table").DataTable({
			columns: [
				{ "data": "current_workload", title: "Workload" },
				{ "data": "disk_available_least", title: "Least Available Disk" },
				{ "data": "free_disk_gb", title: "Free Disk" },
				{ "data": "free_ram_mb", title: "Free RAM" },
				{ "data": "host_ip", title: "IP" },
				{ "data": "hypervisor_hostname", title: "Hostname" },
				{ "data": "hypervisor_type", title: "Type" },
				{ "data": "hypervisor_version", title: "Version" },
				{ "data": "id", title: "ID" },
				{ "data": "local_gb", title: "Local GB" },
				{ "data": "local_gb_used", title: "Local GB Used" },
				{ "data": "memory_mb", title: "Memory" },
				{ "data": "memory_mb_used", title: "Memory Used" },
				{ "data": "running_vms", title: "Running VMs" },
				{ "data": "vcpus", title: "VCPUs" },
				{ "data": "vcpus_used", title: "VCPUs Used" }
			]
		});
		tenantSelect.on("change", function() {
			keystone.setTenantID(tenantSelect.val());
			keystone.authenticate().done(onAuthenticated);
		});
		$("#goButton").on("click", function() {
			keystone = new osclient.Keystone({
				authURL: $("#keystoneBaseURL").val(),
				domainName: 'default',
				username: $("#username").val(),
				password: $("#password").val()
			});
			keystone.authenticate().done(onAuthenticated);
			return false;
		});
	});
})(jQuery);
