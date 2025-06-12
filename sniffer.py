from scapy.all import get_if_list
from scapy.all import *
import platform
import sys

def packet_handler(packet):
    """Process each captured packet"""
    if packet.haslayer(IP):
        ip_src = packet[IP].src
        ip_dst = packet[IP].dst
        print(f"IP Packet: {ip_src} -> {ip_dst}")
        
        if packet.haslayer(TCP):
            tcp_sport = packet[TCP].sport
            tcp_dport = packet[TCP].dport
            print(f"TCP Ports: {tcp_sport} -> {tcp_dport}")
            
        if packet.haslayer(Raw):
            payload = packet[Raw].load
            try:
                print(f"Payload: {payload[:100].decode('utf-8', errors='ignore')}")
            except:
                print("Payload: [binary data]")

def main():
    print(f"Starting packet sniffer on macOS {platform.mac_ver()[0]}")
    
    try:
        # Filter examples:
        # "tcp port 80" - HTTP traffic only
        # "icmp" - ICMP packets only
        # "" - all traffic
        sniff(prn=packet_handler, 
              filter="", 
              store=False,
              iface=get_if_list()[0])  # Use first available interface
    except PermissionError:
        print("Error: Need root privileges. Try running with sudo.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nSniffer stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()

def select_interface():
    print("Available interfaces:")
    for i, iface in enumerate(get_if_list()):
        print(f"{i}: {iface}")
    selection = int(input("Select interface number: "))
    return get_if_list()[selection]

def get_bpf_filter():
    print("\nCommon BPF filters:")
    print("1: All traffic\n2: TCP only\n3: HTTP (port 80)\n4: DNS (port 53)")
    choice = input("Select filter or enter custom BPF: ")
    filters = {
        '1': '',
        '2': 'tcp',
        '3': 'tcp port 80',
        '4': 'udp port 53'
    }
    return filters.get(choice, choice)

if packet.haslayer(DNS):
    if packet[DNS].qr == 0:
        print(f"DNS Query: {packet[DNSQR].qname.decode()}")
    else:
        for x in range(packet[DNS].ancount):
            print(f"DNS Answer: {packet[DNS].an[x].rdata}")