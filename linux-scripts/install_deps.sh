#!/bin/bash
sudo apt install util-linux procps hostapd iproute2 haveged dnsmasq iptables
echo 'ALL ALL=NOPASSWD: /usr/bin/create_ap' | sudo EDITOR='tee -a' visudo -f /etc/sudoers.d/create_ap
sudo cp create_ap /usr/bin
mkdir $HOME/.config/autostart
cp delidock.desktop $HOME/.config/autostart

echo 'SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="a8:42:a1:ed:da:c8", NAME="wifi0"' | sudo EDITOR='tee -a' visudo -f /etc/udev/rules.d/10-network-device.rules
echo 'SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="d8:3a:dd:37:84:35", NAME="ap0"' | sudo EDITOR='tee -a' visudo -f /etc/udev/rules.d/10-network-device.rules