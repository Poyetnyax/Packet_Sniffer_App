const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const execPromise = promisify(exec);
const writeFile = promisify(fs.writeFile);

let tcpdumpProcess = null;
let selectedInterface = null;
let capturedPackets = [];

// DOM Elements
const interfaceList = document.getElementById('interface-list');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const saveBtn = document.getElementById('save-btn');
const saveFormat = document.getElementById('save-format');
const packetTableBody = document.getElementById('packet-table-body');
const errorMessage = document.getElementById('error-message');
const filterInput = document.getElementById('filter-input');

// Get network interfaces
async function getNetworkInterfaces() {
  try {
    const interfaces = await ipcRenderer.invoke('get-network-interfaces');
    console.log('Received interfaces from main process:', interfaces);
    return interfaces;
  } catch (error) {
    console.error('Error getting interfaces:', error);
    return ['en0', 'en1', 'en2', 'en3'];
  }
}

// Parse a single tcpdump line
function parsePacketLine(line) {
  // Example line: "01:23:45.678912 IP 192.168.1.10.54321 > 192.168.1.1.80: Flags [S], seq 123456, length 60"
  const timeMatch = line.match(/^(\d+:\d+:\d+\.\d+)/);
  const ipMatch = line.match(/IP (\d+\.\d+\.\d+\.\d+)(?:\.\d+)? > (\d+\.\d+\.\d+\.\d+)(?:\.\d+)?/);
  const protoMatch = line.match(/(TCP|UDP|ICMP|ARP)/);
  const lengthMatch = line.match(/length (\d+)/);

  const packet = {
    time: timeMatch ? timeMatch[1] : 'N/A',
    src_ip: ipMatch ? ipMatch[1] : 'N/A',
    dst_ip: ipMatch ? ipMatch[2] : 'N/A',
    protocol: protoMatch ? protoMatch[1] : 'Unknown',
    length: lengthMatch ? lengthMatch[1] : 'N/A',
    info: line // Full line as info
  };

  capturedPackets.push(packet);
  return packet;
}

// Save captured packets
async function saveCapture() {
  if (capturedPackets.length === 0) {
    showError('No packets to save!');
    return;
  }

  try {
    const format = saveFormat.value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(process.cwd(), `capture_${timestamp}.${format}`);
    
    // Use IPC to show save dialog
    const filePath = await ipcRenderer.invoke('show-save-dialog', {
      title: 'Save Capture',
      defaultPath: defaultPath,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (!filePath) return; // User cancelled

    if (format === 'json') {
      await writeFile(filePath, JSON.stringify(capturedPackets, null, 2));
    } else if (format === 'pcap') {
      // For PCAP format, we'll use tcpdump to save the raw capture
      const tempFile = path.join(process.cwd(), 'temp_capture.txt');
      await writeFile(tempFile, capturedPackets.map(p => p.info).join('\n'));
      
      // Convert to PCAP using tcpdump
      await execPromise(`tcpdump -r ${tempFile} -w ${filePath}`);
      await fs.promises.unlink(tempFile); // Clean up temp file
    }

    showError('Capture saved successfully!', 'success');
  } catch (error) {
    console.error('Save error:', error);
    showError(`Error saving capture: ${error.message}`);
  }
}

// Start packet capture
async function startCapture() {
  if (!selectedInterface) {
    showError('Please select an interface first!');
    return;
  }

  try {
    // Clear previous error
    hideError();
    
    // Clear previous packets
    packetTableBody.innerHTML = '';
    capturedPackets = [];
    
    // Start tcpdump process
    tcpdumpProcess = exec(`sudo tcpdump -i ${selectedInterface} -n -l`, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    tcpdumpProcess.stdout.on('data', (data) => {
      parseTcpdumpOutput(data.toString());
    });

    tcpdumpProcess.stderr.on('data', (data) => {
      console.error('tcpdump error:', data.toString());
    });

    startBtn.disabled = true;
    stopBtn.disabled = false;
    saveBtn.disabled = true;
    
    // Re-apply current filter if any
    const currentFilter = filterInput.value.trim();
    if (currentFilter) {
      filterPackets(currentFilter);
    }
    
  } catch (error) {
    showError(`Error starting capture: ${error.message}`);
    console.error('Capture error:', error);
  }
}

// Parse tcpdump output line by line
function parseTcpdumpOutput(output) {
  const lines = output.split('\n');
  lines.forEach(line => {
    if (line.trim() === '') return;
    
    try {
      const packet = parsePacketLine(line);
      if (packet) {
        addPacketToTable(packet);
      }
    } catch (e) {
      console.error('Error parsing packet:', e);
    }
  });
}

// Stop capture
function stopCapture() {
  if (tcpdumpProcess) {
    try {
      // First try SIGTERM
      tcpdumpProcess.kill('SIGTERM');
      
      // If process is still running after a short delay, force kill it
      setTimeout(() => {
        if (tcpdumpProcess) {
          tcpdumpProcess.kill('SIGKILL');
        }
      }, 1000);
      
      tcpdumpProcess = null;
    } catch (error) {
      console.error('Error stopping capture:', error);
      showError('Error stopping capture. Please try again.');
    }
  }
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
  saveBtn.disabled = false;
}

// Filter packets
function filterPackets(filterText) {
  const rows = Array.from(packetTableBody.getElementsByTagName('tr'));
  filterText = filterText.toLowerCase().trim();
  
  if (!filterText) {
    // If filter is empty, show all rows
    rows.forEach(row => row.style.display = '');
    return;
  }
  
  rows.forEach(row => {
    const cells = Array.from(row.getElementsByTagName('td'));
    const rowText = cells.map(cell => cell.textContent.toLowerCase()).join(' ');
    row.style.display = rowText.includes(filterText) ? '' : 'none';
  });
}

// Add packet to table
function addPacketToTable(packet) {
  const row = document.createElement('tr');
  
  const cells = [
    packet.time,
    packet.src_ip,
    packet.dst_ip,
    packet.protocol,
    packet.length,
    packet.info
  ];

  cells.forEach(cellText => {
    const cell = document.createElement('td');
    cell.textContent = cellText;
    row.appendChild(cell);
  });

  packetTableBody.prepend(row);
  
  // Apply current filter to the new row
  const currentFilter = filterInput.value.trim();
  if (currentFilter) {
    const rowText = cells.map(cell => cell.textContent.toLowerCase()).join(' ');
    row.style.display = rowText.includes(currentFilter.toLowerCase()) ? '' : 'none';
  }
}

// Show error message
function showError(message, type = 'error') {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  errorMessage.style.color = type === 'error' ? 'red' : 'green';
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(hideError, 3000);
  }
}

function hideError() {
  errorMessage.style.display = 'none';
}

// Initialize
async function init() {
  try {
    const ifaces = await getNetworkInterfaces();
    console.log('Detected interfaces:', ifaces); // Debug log
    
    if (ifaces.length === 0) {
      showError('No network interfaces found!');
      return;
    }

    ifaces.forEach(iface => {
      const ifaceItem = document.createElement('div');
      ifaceItem.className = 'interface-item';
      ifaceItem.textContent = iface;
      ifaceItem.addEventListener('click', () => {
        document.querySelectorAll('.interface-item').forEach(item => {
          item.classList.remove('selected');
        });
        ifaceItem.classList.add('selected');
        selectedInterface = iface;
        console.log('Selected interface:', iface); // Debug log
      });
      interfaceList.appendChild(ifaceItem);
    });
    
    startBtn.addEventListener('click', startCapture);
    stopBtn.addEventListener('click', stopCapture);
    saveBtn.addEventListener('click', saveCapture);
    
    // Add filter input event listener with debounce
    let filterTimeout;
    filterInput.addEventListener('input', (e) => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        filterPackets(e.target.value);
      }, 100);
    });
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Error initializing application: ' + error.message);
  }
}

init();