const fields = document.getElementById('fields');
const fieldSaveBtn = document.getElementById('fieldSaveBtn');
const fieldsText = document.getElementById('fieldsText');
const fieldResetBtn = document.getElementById('fieldResetBtn');
const fieldBackBtn = document.getElementById('fieldBackBtn');

let currentRenames = {}; // Temporary store for renames before saving
let sortableInstance = null; // Reference to Sortable instance

// Function to handle renaming
const handleRename = (originalField, label, textSpan, renameBtn) => {
    textSpan.style.display = 'none';
    renameBtn.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = textSpan.textContent; // Current display name
    label.insertBefore(input, textSpan); // Insert input before the original text span

    const saveRename = () => {
        const newName = input.value.trim();
        if (newName && newName !== textSpan.textContent) {
            textSpan.textContent = newName;
            currentRenames[originalField] = newName; // Store the rename temporarily
        } else if (!newName) {
            // If cleared, revert to original or last saved name
            input.value = textSpan.textContent;
        }
        // Clean up
        input.remove();
        textSpan.style.display = '';
        renameBtn.style.display = '';
    };

    input.focus();
    input.select();

    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        } else if (e.key === 'Escape') {
            // Revert and clean up
            input.remove();
            textSpan.style.display = '';
            renameBtn.style.display = '';
        }
    });
};

const showFieldSection = async () => {
    pushToLastSection(() => {
        showFieldSection();
    });
    hideSections();
    fieldSection.style.display = 'flex';

    // Clear previous fields
    fields.innerHTML = '';
    currentRenames = {}; // Reset temporary renames
    
    // Destroy previous Sortable instance if it exists
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    // Fetch stored customization data
    const { selectedScraper, excludedFields, fieldOrder, fieldRenames } = 
        await chrome.storage.local.get(['selectedScraper', 'excludedFields', 'fieldOrder', 'fieldRenames']);

    if (!selectedScraper) return;

    const scraper = scrapers[selectedScraper];
    if (!scraper) return;

    const scraperId = scraper.id;
    fieldsText.textContent = `Fields of ${scraper.name}`;

    const currentExcluded = excludedFields?.[scraperId] || [];
    const currentOrder = fieldOrder?.[scraperId] || scraper.fields;
    const savedRenames = fieldRenames?.[scraperId] || {};
    currentRenames = { ...savedRenames };

    const finalFieldOrder = [...new Set([...currentOrder, ...scraper.fields])];
    const fieldsToShow = finalFieldOrder.filter(field => scraper.fields.includes(field));

    fieldsToShow.forEach(originalField => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field';
        fieldDiv.dataset.originalField = originalField;

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        const checkboxId = `field-${originalField.replace(/\W+/g, '-')}`;
        checkbox.id = checkboxId;
        checkbox.checked = !currentExcluded.includes(originalField);
        checkbox.className = 'fieldCheckbox';

        // Label container
        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.className = 'fieldName';

        // Field name text span
        const nameTextSpan = document.createElement('span');
        nameTextSpan.className = 'field-name-text';
        nameTextSpan.textContent = currentRenames[originalField] || originalField;

        // Rename button (available for all users)
        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-btn';
        renameBtn.title = 'Rename field';
        const penIcon = document.createElement('img');
        penIcon.src = 'images/pen.svg';
        penIcon.alt = 'Rename';
        renameBtn.appendChild(penIcon);
        renameBtn.onclick = (e) => {
            e.preventDefault();
            handleRename(originalField, label, nameTextSpan, renameBtn);
        };
        label.appendChild(renameBtn);
        label.insertBefore(nameTextSpan, label.firstChild); // Ensure text comes first

        fieldDiv.appendChild(checkbox);
        fieldDiv.appendChild(label);

        fields.appendChild(fieldDiv);
    });

    // Initialize SortableJS - enable for all users
    sortableInstance = new Sortable(fields, {
        animation: 150,
        ghostClass: 'drag-over',
        handle: '.field', // Allow dragging by the entire field element
        dataIdAttr: 'data-original-field' // Use the original field name as the ID for sorting
    });

    // --- Handle Paid Indicators --- 
    [fieldSaveBtn, fieldResetBtn].forEach(btn => {
        // Remove existing paid div if present
        const existingPaidDiv = btn.querySelector('.paidDivFields');
        if (existingPaidDiv) {
            existingPaidDiv.remove();
        }
        btn.classList.remove('paid'); // Remove class first
    });

    // --- Save Button Logic --- 
    fieldSaveBtn.onclick = async () => {
        // Get current order from DOM using SortableJS
        const newFieldOrder = sortableInstance.toArray();

        // Get excluded fields from checkboxes
        const newExcludedFields = [];
        newFieldOrder.forEach(originalField => {
            const checkbox = document.querySelector(`#field-${originalField.replace(/\W+/g, '-')}`);
            if (checkbox && !checkbox.checked) {
                newExcludedFields.push(originalField);
            }
        });

        // Get final renames (already stored in currentRenames)
        const finalRenames = { ...currentRenames };

        // Clean up renames: remove entries where the name is back to the original
        Object.keys(finalRenames).forEach(original => {
            if (finalRenames[original] === original) {
                delete finalRenames[original];
            }
        });

        // Retrieve existing settings to update
        chrome.storage.local.get(['excludedFields', 'fieldOrder', 'fieldRenames'], function(storageResult) {
            const updatedExcludedFields = {
                ...(storageResult.excludedFields || {}),
                [scraperId]: newExcludedFields
            };
            const updatedFieldOrder = {
                ...(storageResult.fieldOrder || {}),
                [scraperId]: newFieldOrder
            };
            const updatedFieldRenames = {
                ...(storageResult.fieldRenames || {}),
                [scraperId]: finalRenames
            };

            // Save all updated settings
            chrome.storage.local.set({
                excludedFields: updatedExcludedFields,
                fieldOrder: updatedFieldOrder,
                fieldRenames: updatedFieldRenames
            }, async () => {
                await showFinalSection(); // Go back after saving
            });
        });
    };

    // --- Reset Button Logic --- 
    fieldResetBtn.onclick = async () => {
        // Confirmation step?
        if (!confirm('Are you sure you want to reset all field customizations (order, renames, visibility) for this scraper?')) {
            return;
        }

        // Delete all settings and show field section
        chrome.storage.local.remove(['excludedFields', 'fieldOrder', 'fieldRenames'], function() {
            showFieldSection();
        });
    };

    // --- Back Button Logic --- 
    fieldBackBtn.onclick = () => {
        showFinalSection(); // Navigate back to the final section
    };
};

customizeFieldsBtn.onclick = () => {
    showFieldSection();
};
