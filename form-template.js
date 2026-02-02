export function generateClientFormHTML(client, reportType, vehicleDatabase) {
  // Generate clean email address from client name
  const cleanClientName = client.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all special characters and spaces
    .trim();
  
  const clientEmail = `dynamicfleetreports+${cleanClientName}@gmail.com`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${client.name} - Vehicle Data Collection Form</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Outfit', sans-serif; 
            background: linear-gradient(135deg, #020617 0%, #0f172a 100%); 
            color: #e2e8f0; 
            padding: 40px 20px;
            min-height: 100vh;
        }
        .container { 
            max-width: 1600px; 
            margin: 0 auto; 
            background: rgba(30, 41, 59, 0.6); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 24px; 
            padding: 48px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header { margin-bottom: 40px; }
        .title { 
            font-size: 48px; 
            font-weight: 900; 
            font-style: italic; 
            text-transform: uppercase; 
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }
        .subtitle { 
            font-size: 11px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.4em; 
            color: #10b981; 
            opacity: 0.7;
        }
        .info-panel { 
            background: rgba(16, 185, 129, 0.1); 
            border: 1px solid rgba(16, 185, 129, 0.3); 
            border-radius: 16px; 
            padding: 24px; 
            margin-bottom: 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
        }
        .info-item label { 
            display: block;
            font-size: 9px; 
            font-weight: 900; 
            text-transform: uppercase; 
            color: rgba(255,255,255,0.4); 
            margin-bottom: 6px;
            letter-spacing: 0.1em;
        }
        .info-item .value { 
            font-weight: 700; 
            color: white;
            font-size: 15px;
        }
        .email-notice {
            background: rgba(251, 191, 36, 0.1);
            border: 2px solid rgba(251, 191, 36, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .email-notice strong {
            color: #fbbf24;
            font-size: 16px;
        }
        .email-address {
            color: #34d399;
            font-weight: 900;
            font-size: 18px;
            margin: 12px 0;
            font-family: monospace;
        }
        table { 
            width: 100%; 
            border-collapse: separate;
            border-spacing: 0;
            margin: 30px 0;
            background: rgba(15, 23, 42, 0.4);
            border-radius: 12px;
            overflow: hidden;
        }
        thead { background: rgba(16, 185, 129, 0.1); }
        th { 
            padding: 16px 12px; 
            font-size: 10px; 
            font-weight: 900; 
            text-transform: uppercase; 
            text-align: left; 
            color: #10b981; 
            border-bottom: 2px solid #10b981;
            letter-spacing: 0.05em;
        }
        td { 
            padding: 12px; 
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        tbody tr:hover { background: rgba(16, 185, 129, 0.05); }
        input, select { 
            width: 100%; 
            background: #0f172a; 
            border: 2px solid rgba(255,255,255,0.1); 
            border-radius: 8px; 
            padding: 12px; 
            color: white; 
            font-size: 14px; 
            font-family: 'Outfit', sans-serif;
            transition: all 0.2s;
        }
        input:focus, select:focus { 
            outline: none; 
            border-color: #10b981; 
            background: #1e293b; 
        }
        input::placeholder { color: rgba(255,255,255,0.3); }
        .row-num { 
            font-weight: 900; 
            color: rgba(255,255,255,0.3);
            font-size: 14px;
            text-align: center;
        }
        .btn-primary { 
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%); 
            color: #020617; 
            font-weight: 900; 
            text-transform: uppercase; 
            font-size: 14px; 
            padding: 20px 48px; 
            border: none; 
            border-radius: 12px; 
            cursor: pointer; 
            width: 100%; 
            margin-top: 30px;
            transition: all 0.3s;
            letter-spacing: 0.05em;
        }
        .btn-primary:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4); 
        }
        .instructions { 
            background: rgba(59, 130, 246, 0.1); 
            border: 1px solid rgba(59, 130, 246, 0.3); 
            border-radius: 12px; 
            padding: 24px; 
            margin-top: 40px; 
            font-size: 13px; 
            line-height: 1.8;
        }
        .instructions strong { color: #60a5fa; }
        .instructions ol { margin-left: 20px; margin-top: 12px; }
        .instructions li { margin-bottom: 8px; }
        .auto-complete { 
            font-size: 11px; 
            color: #34d399; 
            margin-top: 4px;
            font-weight: 600;
        }
        @media print {
            body { background: white; color: black; }
            .container { border: 2px solid black; }
            input, select { border: 1px solid black; background: white; color: black; }
            .btn-primary { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="subtitle">Vehicle Data Collection Form • ${reportType === 'weekly' ? 'Weekly Report' : 'Monthly Report'}</div>
            <div class="title">${client.name}</div>
        </div>
        
        <div class="email-notice">
            <strong>📧 Submit Completed Form To:</strong>
            <div class="email-address">${clientEmail}</div>
            <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 8px;">
                When you click Submit, your email will open automatically with the data file attached
            </p>
        </div>

        <div class="info-panel">
            <div class="info-item">
                <label>Contact Person</label>
                <div class="value">${client.contact || 'N/A'}</div>
            </div>
            <div class="info-item">
                <label>Email</label>
                <div class="value">${client.email || 'N/A'}</div>
            </div>
            <div class="info-item">
                <label>Fleet Size</label>
                <div class="value">${client.fleetSize || 10} Vehicles</div>
            </div>
            <div class="info-item">
                <label>Report Period</label>
                <div class="value">${reportType === 'weekly' ? 'Weekly' : 'Monthly'}</div>
            </div>
            <div class="info-item">
                <label>Date Generated</label>
                <div class="value">${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <div class="info-item">
                <label>Speed Limit</label>
                <div class="value">${client.speedLimit || 80} km/h</div>
            </div>
        </div>

        <form id="vehicleForm" onsubmit="return handleSubmit(event)">
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Registration</th>
                        <th style="width: 120px;">Make</th>
                        <th style="width: 140px;">Model</th>
                        <th style="width: 100px;">Year</th>
                        <th style="width: 140px;">Used For</th>
                        <th style="width: 100px;">Target km/L</th>
                        <th style="width: 140px;">Odometer (km)</th>
                        <th style="width: 140px;">Fuel Used (L)</th>
                        <th style="width: 120px;">Speed Violations</th>
                        <th style="width: 120px;">Max Speed</th>
                    </tr>
                </thead>
                <tbody id="vehicleRows">
                    ${Array.from({ length: client.fleetSize || 10 }, (_, i) => `
                    <tr>
                        <td class="row-num">${i + 1}</td>
                        <td>
                            <input type="text" name="reg_${i + 1}" placeholder="e.g. ABC123GP" required 
                                   oninput="updateRowFromReg(this, ${i + 1})">
                        </td>
                        <td>
                            <input type="text" name="make_${i + 1}" placeholder="e.g. Volvo" 
                                   oninput="updateModelSuggestions(${i + 1})">
                        </td>
                        <td>
                            <input type="text" name="model_${i + 1}" placeholder="e.g. FH440" 
                                   oninput="autoFillSpecs(${i + 1})">
                            <div class="auto-complete" id="suggest_${i + 1}"></div>
                        </td>
                        <td>
                            <input type="text" name="year_${i + 1}" placeholder="2022">
                        </td>
                        <td>
                            <select name="usedFor_${i + 1}" onchange="updateTargetKmL(${i + 1})">
                                <option value="Long Distance">Long Distance</option>
                                <option value="Local Full">Local Full</option>
                                <option value="Local 50%">Local 50%</option>
                            </select>
                        </td>
                        <td>
                            <input type="number" step="0.1" name="targetKmL_${i + 1}" placeholder="2.3">
                        </td>
                        <td>
                            <input type="number" name="odo_${i + 1}" placeholder="0" required>
                        </td>
                        <td>
                            <input type="number" step="0.1" name="liters_${i + 1}" placeholder="0.0" required>
                        </td>
                        <td>
                            <input type="number" name="speedViolations_${i + 1}" placeholder="0">
                        </td>
                        <td>
                            <input type="number" name="maxSpeed_${i + 1}" placeholder="0">
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <button type="submit" class="btn-primary">
                ✅ Submit Report (Email Opens Automatically)
            </button>
        </form>

        <div class="instructions">
            <strong>📋 How to Complete This Form:</strong>
            <ol>
                <li><strong>Registration:</strong> Enter the exact vehicle registration number</li>
                <li><strong>Make & Model:</strong> As you type, suggestions will appear based on our vehicle database</li>
                <li><strong>Year:</strong> Manufacturing year of the vehicle</li>
                <li><strong>Used For:</strong> Select primary usage pattern (Long Distance/Local Full/Local 50%)</li>
                <li><strong>Target km/L:</strong> Auto-fills based on vehicle make/model and usage</li>
                <li><strong>Odometer:</strong> Current odometer reading in kilometers</li>
                <li><strong>Fuel Used:</strong> Total liters used during this ${reportType === 'weekly' ? 'week' : 'month'}</li>
                <li><strong>Speed Data:</strong> Enter speed violations and maximum speed if available</li>
            </ol>
            <p style="margin-top: 16px;"><strong>💾 After Completion:</strong> Click "Submit Report" and your email will open automatically with the data file. Just click Send!</p>
            <p style="margin-top: 8px; color: #34d399;"><strong>💡 Pro Tip:</strong> Your entries are auto-saved every 30 seconds!</p>
        </div>
    </div>

    <script>
        const VEHICLE_SPECS = ${JSON.stringify(vehicleDatabase)};
        const CLIENT_EXISTING_VEHICLES = {};
        const SUBMISSION_EMAIL = '${clientEmail}';
        const CLIENT_NAME = '${client.name}';
        const REPORT_TYPE = '${reportType}';

        function autoFillSpecs(rowNum) {
            const makeInput = document.querySelector(\`input[name="make_\${rowNum}"]\`);
            const modelInput = document.querySelector(\`input[name="model_\${rowNum}"]\`);
            const targetInput = document.querySelector(\`input[name="targetKmL_\${rowNum}"]\`);
            const usedForSelect = document.querySelector(\`select[name="usedFor_\${rowNum}"]\`);
            const suggestDiv = document.getElementById(\`suggest_\${rowNum}\`);

            const makeModel = \`\${makeInput.value} \${modelInput.value}\`.trim();
            
            if (VEHICLE_SPECS[makeModel]) {
                const specs = VEHICLE_SPECS[makeModel];
                if (!targetInput.value) {
                    targetInput.value = specs.targetKmL;
                }
                if (specs.category) {
                    usedForSelect.value = specs.category;
                }
                suggestDiv.textContent = \`✓ Specs loaded: \${specs.targetKmL} km/L target\`;
                setTimeout(() => suggestDiv.textContent = '', 3000);
            }
        }

        function updateModelSuggestions(rowNum) {
            const makeInput = document.querySelector(\`input[name="make_\${rowNum}"]\`);
            const make = makeInput.value.toLowerCase();
            
            if (make.length < 2) return;

            const matches = Object.keys(VEHICLE_SPECS).filter(key => 
                key.toLowerCase().startsWith(make)
            );

            if (matches.length > 0) {
                const suggestDiv = document.getElementById(\`suggest_\${rowNum}\`);
                suggestDiv.textContent = \`Suggestions: \${matches.slice(0, 3).join(', ')}\`;
            }
        }

        function updateTargetKmL(rowNum) {
            const usedForSelect = document.querySelector(\`select[name="usedFor_\${rowNum}"]\`);
            const targetInput = document.querySelector(\`input[name="targetKmL_\${rowNum}"]\`);
            const makeInput = document.querySelector(\`input[name="make_\${rowNum}"]\`);
            const modelInput = document.querySelector(\`input[name="model_\${rowNum}"]\`);

            const makeModel = \`\${makeInput.value} \${modelInput.value}\`.trim();
            const usedFor = usedForSelect.value;

            if (VEHICLE_SPECS[makeModel]) {
                targetInput.value = VEHICLE_SPECS[makeModel].targetKmL;
            } else {
                if (usedFor === 'Long Distance') targetInput.value = '2.3';
                else if (usedFor === 'Local Full') targetInput.value = '2.1';
                else if (usedFor === 'Local 50%') targetInput.value = '2.8';
            }
        }

        function updateRowFromReg(input, rowNum) {
            const reg = input.value.toUpperCase();
            input.value = reg;

            if (CLIENT_EXISTING_VEHICLES[reg]) {
                const vehicle = CLIENT_EXISTING_VEHICLES[reg];
                document.querySelector(\`input[name="make_\${rowNum}"]\`).value = vehicle.make || '';
                document.querySelector(\`input[name="model_\${rowNum}"]\`).value = vehicle.model || '';
                document.querySelector(\`input[name="year_\${rowNum}"]\`).value = vehicle.year || '';
                document.querySelector(\`select[name="usedFor_\${rowNum}"]\`).value = vehicle.usedFor || 'Long Distance';
                document.querySelector(\`input[name="targetKmL_\${rowNum}"]\`).value = vehicle.targetKmL || '2.3';
            }
        }

        function handleSubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                client: CLIENT_NAME,
                reportType: REPORT_TYPE,
                generatedDate: '${new Date().toISOString()}',
                submittedDate: new Date().toISOString(),
                speedLimit: ${client.speedLimit || 80},
                vehicles: []
            };

            const totalVehicles = ${client.fleetSize || 10};
            
            for (let i = 1; i <= totalVehicles; i++) {
                const reg = formData.get(\`reg_\${i}\`);
                const odo = formData.get(\`odo_\${i}\`);
                const liters = formData.get(\`liters_\${i}\`);

                if (reg && odo && liters) {
                    const vehicle = {
                        number: i,
                        registration: reg,
                        make: formData.get(\`make_\${i}\`) || '',
                        model: formData.get(\`model_\${i}\`) || '',
                        year: formData.get(\`year_\${i}\`) || '',
                        usedFor: formData.get(\`usedFor_\${i}\`) || 'Long Distance',
                        targetKmL: parseFloat(formData.get(\`targetKmL_\${i}\`)) || 2.3,
                        odometer: parseInt(odo),
                        liters: parseFloat(liters),
                        speedViolations: parseInt(formData.get(\`speedViolations_\${i}\`)) || 0,
                        maxSpeed: parseInt(formData.get(\`maxSpeed_\${i}\`)) || 0
                    };
                    data.vehicles.push(vehicle);
                }
            }

            if (data.vehicles.length === 0) {
                alert('❌ Please fill in at least one vehicle!');
                return false;
            }

            // Create JSON data
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create filename
            const filename = \`\${data.client.replace(/\\s+/g, '_')}_\${data.reportType}_\${new Date().toISOString().split('T')[0]}.json\`;
            
            // Download file as backup
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.click();
            
            // Prepare email
            const emailSubject = encodeURIComponent(\`Fleet Report - \${CLIENT_NAME} - \${REPORT_TYPE.charAt(0).toUpperCase() + REPORT_TYPE.slice(1)} - \${new Date().toISOString().split('T')[0]}\`);
            const emailBody = encodeURIComponent(\`Hi,

Please find attached my \${REPORT_TYPE} fleet report for \${CLIENT_NAME}.

Report Details:
- Client: \${CLIENT_NAME}
- Period: \${REPORT_TYPE.charAt(0).toUpperCase() + REPORT_TYPE.slice(1)}
- Date: \${new Date().toISOString().split('T')[0]}
- Vehicles: \${data.vehicles.length}

The JSON data file has been downloaded to my computer. I will attach it to this email.

Filename: \${filename}

Best regards\`);

            // Open email client with pre-filled information
            const mailtoLink = \`mailto:\${SUBMISSION_EMAIL}?subject=\${emailSubject}&body=\${emailBody}\`;
            window.location.href = mailtoLink;
            
            // Show success message
            setTimeout(() => {
                alert(\`✅ Success! Data for \${data.vehicles.length} vehicles saved.\\n\\n📧 Your email should open now with everything pre-filled.\\n\\n📎 Please attach the downloaded file: \${filename}\\n\\nThen click Send!\`);
            }, 1000);
            
            // Clean up
            URL.revokeObjectURL(url);
            localStorage.removeItem('vehicleFormDraft_${client.name.replace(/\s+/g, '_')}');
            
            return false;
        }

        // Auto-save every 30 seconds
        setInterval(() => {
            const formData = {};
            document.querySelectorAll('input, select').forEach(input => {
                if (input.value) formData[input.name] = input.value;
            });
            localStorage.setItem('vehicleFormDraft_${client.name.replace(/\s+/g, '_')}', JSON.stringify(formData));
        }, 30000);

        // Restore draft on load
        window.onload = function() {
            const draft = localStorage.getItem('vehicleFormDraft_${client.name.replace(/\s+/g, '_')}');
            if (draft && confirm('Found saved progress. Restore?')) {
                const data = JSON.parse(draft);
                Object.keys(data).forEach(key => {
                    const input = document.querySelector(\`[name="\${key}"]\`);
                    if (input) input.value = data[key];
                });
            }
        };
    </script>
</body>
</html>`;
}