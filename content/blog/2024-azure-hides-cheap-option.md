+++
title = "Azure sneakily hides cheaper option in it's UI"
date = "2024-01-31"
+++

Recently a friend had to set up some cloud infrastructure on Azure. He was trying to create a VPN
Gateway through the web UI, but couldn't find the "Basic" tier (the cheapest on Azure). The only
available options started at more than $100 / month!

He later stumbled upon [this support
request](https://learn.microsoft.com/en-us/answers/questions/1382332/azure-create-vpn-gw-not-found-the-basic-option-on)
([archived](https://web.archive.org/web/20240131105624/https://learn.microsoft.com/en-us/answers/questions/1382332/azure-create-vpn-gw-not-found-the-basic-option-on)),
where a Microsoft employee shamelessly explains what's going on: _the Basic SKU is no longer
available in Azure portal. And you have to use PowerShell or CLI if you want to create a Basic SKU
VPN Gateway._ It turns out this is even "documented" in a dark corner of their
[FAQ](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq#vpn-basic).

From the perspective of a user who's trying to get something done through the Azure portal, this
seems like Microsoft is intentionally hiding the existence of this product's basic tier. My
expectations for cloud vendors were already low, but this hits a new record.
