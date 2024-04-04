#!/bin/bash
sudo apt install util-linux procps hostapd iproute2 haveged dnsmasq iptables
echo 'ALL ALL=NOPASSWD: /usr/bin/create_ap' | sudo EDITOR='tee -a' visudo -f /etc/sudoers.d/create_ap
sudo cp create_ap /usr/bin
