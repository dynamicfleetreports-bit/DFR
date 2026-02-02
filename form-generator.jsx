import React, { useState, useEffect } from 'react';
import { Download, FileText, Truck, Database } from 'lucide-react';
import { generateClientFormHTML } from './form-template';

export default function VehicleDataFormGenerator() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [reportType, setReportType] = useState('weekly');
  const [showModal, setShowModal] = useState(false);
  const [vehicleDatabase, setVehicleDatabase] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load active clients from localStorage
    const activeClients = JSON.parse(localStorage.getItem('fleetHistory')) || [];
    setClients(activeClients);

    // Load or initialize vehicle database
    const savedDB = localStorage.getItem('VEHICLE_SPECS_DB');
    if (savedDB) {
      setVehicleDatabase(JSON.parse(savedDB));
    } else {
      // Initialize with common truck specs
      const defaultDB = {
        'Volvo FH440': { targetKmL: 2.3, type: 'Heavy', category: 'Long Distance' },
        'Volvo FH460': { targetKmL: 2.2, type: 'Heavy', category: 'Long Distance' },
        'Scania R450': { targetKmL: 2.4, type: 'Heavy', category: 'Long Distance' },
        'Scania G460': { targetKmL: 2.3, type: 'Heavy', category: 'Long Distance' },
        'Mercedes Actros 1844': { targetKmL: 2.2, type: 'Heavy', category: 'Long Distance' },
        'Mercedes Actros 2644': { targetKmL: 2.1, type: 'Heavy', category: 'Long Distance' },
        'MAN TGX 440': { targetKmL: 2.3, type: 'Heavy', category: 'Long Distance' },
        'MAN TGS 440': { targetKmL: 2.2, type: 'Heavy', category: 'Long Distance' },
        'Isuzu FTR 850': { targetKmL: 3.5, type: 'Medium', category: 'Local Full' },
        'Isuzu FSR 800': { targetKmL: 3.8, type: 'Medium', category: 'Local Full' },
        'Hino 500': { targetKmL: 3.6, type: 'Medium', category: 'Local Full' },
        'UD Quon': { targetKmL: 2.4, type: 'Heavy', category: 'Long Distance' }
      };
      setVehicleDatabase(defaultDB);
      localStorage.setItem('VEHICLE_SPECS_DB', JSON.stringify(defaultDB));
    }
  };

  const generateFormForClient = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const createVehicleDataForm = () => {
    if (!selectedClient) return;

    // Generate the HTML using the template
    const formHTML = generateClientFormHTML(selectedClient, reportType, vehicleDatabase);

    // Download the HTML file
    const blob = new Blob([formHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient.name.replace(/\s+/g, '_')}_${reportType}_form.html`;
    a.click();
    URL.revokeObjectURL(url);

    setShowModal(false);
    alert(`✅ Form generated for ${selectedClient.name}!\n\nEmail this HTML file to your client. They can fill it out and send back the JSON file.`);
  };

  const addVehicleToDatabase = () => {
    const make = prompt('Enter vehicle make (e.g., Volvo):');
    if (!make) return;
    
    const model = prompt('Enter vehicle model (e.g., FH440):');
    if (!model) return;
    
    const targetKmL = parseFloat(prompt('Enter target km/L (e.g., 2.3):'));
    if (!targetKmL) return;
    
    const type = prompt('Vehicle type (Heavy/Medium):') || 'Heavy';
    const category = prompt('Typical usage (Long Distance/Local Full/Local 50%):') || 'Long Distance';

    const key = `${make} ${model}`;
    const newDB = {
      ...vehicleDatabase,
      [key]: { targetKmL, type, category }
    };

    setVehicleDatabase(newDB);
    localStorage.setItem('VEHICLE_SPECS_DB', JSON.stringify(newDB));
    alert(`✅ Added ${key} to vehicle database!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-2">
            Active Client Management
          </p>
          <h1 className="text-5xl font-black italic uppercase text-white mb-4">
            Generate <span className="text-emerald-400">Data Forms</span>
          </h1>
          <p className="text-sm text-white/60 max-w-3xl">
            Generate customized vehicle data collection forms for active clients. Forms include vehicle-specific targets from our database and can be filled out offline.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black uppercase text-emerald-400">Active Clients</h3>
            </div>
            <p className="text-4xl font-black italic text-white">{clients.length}</p>
            <p className="text-xs text-white/40 uppercase font-bold mt-1">Ready for forms</p>
          </div>

          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-black uppercase text-blue-400">Vehicle Database</h3>
            </div>
            <p className="text-4xl font-black italic text-white">{Object.keys(vehicleDatabase).length}</p>
            <p className="text-xs text-white/40 uppercase font-bold mt-1">Vehicle specs stored</p>
          </div>

          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 flex items-center justify-center">
            <button
              onClick={addVehicleToDatabase}
              className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-black py-4 rounded-xl uppercase text-xs hover:bg-blue-500/30 transition"
            >
              + Add Vehicle Specs
            </button>
          </div>
        </div>

        {/* Client Selection */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-8">
          <h2 className="text-lg font-black uppercase text-white mb-6">Select Client for Form Generation</h2>
          
          {clients.length === 0 ? (
            <div className="text-center py-20 text-white/20">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-black uppercase text-xs">No active clients found</p>
              <p className="text-xs mt-2">Convert prospects to active clients first</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clients.map((client, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition group"
                >
                  <h3 className="text-lg font-black text-white mb-2 truncate">{client.name}</h3>
                  <div className="space-y-1 text-xs text-white/50 mb-4">
                    <p><strong>Contact:</strong> {client.contact || 'N/A'}</p>
                    <p><strong>Fleet:</strong> {client.fleetSize || 0} vehicles</p>
                    <p><strong>Type:</strong> {client.vehicleType || 'Not specified'}</p>
                  </div>
                  <button
                    onClick={() => generateFormForClient(client)}
                    className="w-full bg-emerald-500 text-slate-900 font-black py-3 rounded-lg uppercase text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Generate Form
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <h3 className="text-sm font-black uppercase text-blue-400 mb-3">💡 Vehicle Database Info</h3>
          <div className="text-xs text-blue-300 space-y-2">
            <p>
              <strong>Current database includes:</strong> {Object.keys(vehicleDatabase).slice(0, 5).join(', ')}
              {Object.keys(vehicleDatabase).length > 5 && ` and ${Object.keys(vehicleDatabase).length - 5} more...`}
            </p>
            <p>
              <strong>How it works:</strong> When clients fill out the form, they can type vehicle make/model and the form will auto-suggest target km/L based on your database.
            </p>
            <p className="text-emerald-400">
              <strong>Pro tip:</strong> Add new vehicle specs as you encounter them to build a comprehensive database!
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 border-2 border-emerald-500 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-black italic uppercase text-white mb-6">
              Select <span className="text-emerald-400">Period</span>
            </h2>
            <p className="text-sm text-white/60 mb-8">
              What reporting period is this form for?
            </p>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={() => {
                  setReportType('weekly');
                  createVehicleDataForm();
                }}
                className="w-full bg-emerald-500 text-slate-900 font-black py-4 rounded-xl uppercase text-sm hover:bg-emerald-400 transition"
              >
                📅 Weekly Report
              </button>
              <button
                onClick={() => {
                  setReportType('monthly');
                  createVehicleDataForm();
                }}
                className="w-full bg-slate-700 border border-white/10 text-white font-black py-4 rounded-xl uppercase text-sm hover:bg-slate-600 transition"
              >
                📆 Monthly Report
              </button>
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-slate-900/50 border border-white/10 text-white/60 font-black py-3 rounded-xl uppercase text-xs hover:bg-slate-900 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}