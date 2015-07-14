var chartBaseConfig = {
	"header": {
		"title": {
			"fontSize": 24,
			"font": "open sans"
		},
		"subtitle": {
			"color": "#999999",
			"fontSize": 12,
			"font": "open sans"
		},
		"titleSubtitlePadding": 9
	},
	"footer": {
		"color": "#999999",
		"fontSize": 10,
		"font": "open sans",
		"location": "bottom-left"
	},
	"size": {
		"pieOuterRadius": "90%"
	},
	"data": {
		"sortOrder": "value-desc",
		"smallSegmentGrouping": {
			"enabled": true
		}
		/* DATA GOES HERE
		,
		content: [
			{ label: "Name 1", value: val1 }
		]
		*/
	},
	"labels": {
		"outer": {
			"format": "label-value2",
			"pieDistance": 32
		},
		"inner": {
			"hideWhenLessThanPercentage": 3
		},
		"mainLabel": {
			"fontSize": 11
		},
		"percentage": {
			"color": "#ffffff",
			"decimalPlaces": 0
		},
		"value": {
			"color": "#adadad",
			"fontSize": 11
		},
		"lines": {
			"enabled": true
		},
		"truncation": {
			"enabled": true
		}
	},
	"tooltips": {
		"enabled": true,
		"type": "placeholder",
		"string": "{label}: {value} ({percentage}%)"
	},
	"effects": {
		"load": {
			"speed": 250
		},
		"pullOutSegmentOnClick": {
			"effect": "elastic",
			"speed": 400,
			"size": 15
		}
	},
	"misc": {
		"gradient": {
			"enabled": true,
			"percentage": 81
		}
	},
	"callbacks": {
		onClickSegment: function(event) {
			// TODO
		}
	}
};

function makePieChartDataTenantResources(keystone, instances, onComplete) {
	// FIXME: Hideously inefficient.
	var byTenant = {}, promises = [], flavours = [];
	promises.push(nova.getFlavorsDetailed(function(flavours) {
		$(flavours.flavors).each(function(i, flavour) {
			flavours[flavour.id] = flavour;
		});
	}));
	$(instances.servers).each(function(i, instance) {
		if (!(instance.flavor.id in flavours)) {
			// This may be a flavour deleted since the instance was booted.
			promises.push(nova.getFlavorByID(instance.flavor.id, function(flavour) {
				flavours[instance.flavor.id] = flavour.flavor;
			}));
		}
		if (!(instance.tenant_id in byTenant)) {
			byTenant[instance.tenant_id] = {
				vcpus: 0,
				ram: 0,
				disk: 0,
				ephemeral: 0
			};
			promises.push(keystone.getTenantByID(instance.tenant_id, function(tenant) {
				byTenant[instance.tenant_id].tenantName = tenant.project.name;
			}));
		}
	});
	$.when.apply($, promises).done(function() {
		$(instances.servers).each(function(i, instance) {
			byTenant[instance.tenant_id].vcpus += flavours[instance.flavor.id].vcpus;
			byTenant[instance.tenant_id].ram += flavours[instance.flavor.id].ram;
			byTenant[instance.tenant_id].disk += flavours[instance.flavor.id].disk;
			if ("OS-FLV-EXT-DATA:ephemeral" in flavours[instance.flavor.id]) {
				byTenant[instance.tenant_id].ephemeral += flavours[instance.flavor.id]["OS-FLV-EXT-DATA:ephemeral"];
			}
		});
		onComplete(byTenant);
	});
}

function makePieChartDataTenantResource(keystone, instances, resource, onComplete) {
	var data = [];
	makePieChartDataTenantResources(keystone, instances, function(tenants) {
		$.each(tenants, function(tenantID, tenant) {
			data.push({
				label: tenant.tenantName,
				value: tenant[resource]
			});
		});
		onComplete(data);
	});
}

function makePieChart(element, thisChartConfig) {
	var chartConfig = {};
	$.extend(true, chartConfig, chartBaseConfig, thisChartConfig);
	var pie = new d3pie(element[0], chartConfig);
}
