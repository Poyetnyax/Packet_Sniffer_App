# Packet Sniffer Application

A GUI-based network packet sniffer application built with Electron that allows you to capture, analyze, and save network packets.

## Features

- Real-time packet capture
- Network interface selection
- Packet filtering
- Save captures in JSON or PCAP format
- User-friendly interface
- Support for macOS


## Prerequisites

Before running the application, make sure you have the following installed:

1. Node.js (v14 or higher)
2. npm (comes with Node.js)
3. Python 3.7 or higher
4. pip (Python package manager)
5. tcpdump (for packet capture)
6. sudo privileges (required for packet capture)

### Installing tcpdump on macOS

```bash
brew install tcpdump
```

### Installing Python Dependencies

```bash
pip install -r requirements.txt
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
cd sniffer_gui
npm install
```

Install electrons:
```bash
cd packet-sniffer-gui
npm init -y
npm install electron --save-dev
npm install pcap-parser child-process-promise fs-extra --save

## Running the Application

1. Start the GUI application:
```bash
cd sniffer_gui
sudo npm start
```

3. If you get a permission error, you'll need to run tcpdump with sudo privileges. You can either:
   - Run the application with sudo: `sudo npm start`
   - Or add tcpdump to sudoers (not recommended for security reasons)

## Using the Application

### Starting a Capture

1. Select a network interface from the list
2. Click the "Start Capture" button
3. The application will begin capturing packets
4. Packets will be displayed in real-time in the table

### Filtering Packets

- Use the filter input field above the packet table
- Type any text to filter packets
- The filter works across all columns (time, source, destination, protocol, length, info)
- Filter is case-insensitive
- Filter updates in real-time

### Saving Captures

1. Stop the capture using the "Stop Capture" button
2. Select the desired format (JSON or PCAP) from the dropdown
3. Click the "Save Capture" button
4. Choose where to save the file
5. The file will be saved with a timestamp in the filename

### File Formats

- **JSON**: Human-readable format containing all packet details
- **PCAP**: Raw packet capture format that can be opened in Wireshark

## Troubleshooting

### No Interfaces Showing

If no network interfaces are showing:
1. Check if you have any network interfaces available
2. Run `networksetup -listallhardwareports` in terminal to verify
3. Make sure the application has proper permissions

### Permission Errors

If you get permission errors:
1. Make sure tcpdump is installed
2. Try running the application with sudo
3. Check if your user has the necessary permissions

### Save Dialog Not Working

If the save dialog doesn't appear:
1. Make sure you've stopped the capture first
2. Check if you have write permissions in the selected directory
3. Verify that the application has proper permissions

## Security Note

This application requires root/sudo privileges to capture packets. Use it responsibly and only on networks you own or have permission to monitor.

## License

[Your License Here]
