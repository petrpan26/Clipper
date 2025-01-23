// Function to create a history item element
function createHistoryItem(text) {
    const div = document.createElement('div');
    div.className = 'clipboard-item';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'clipboard-text';
    textSpan.textContent = text;
    textSpan.title = text; // Show full text on hover
    
    const copyIcon = document.createElement('span');
    copyIcon.className = 'copy-icon';
    copyIcon.innerHTML = '📋'; // Clipboard emoji

    div.appendChild(textSpan);
    div.appendChild(copyIcon);

    div.addEventListener('click', async () => {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: 'copyText', text: text}, resolve);
            });
            
            if (response?.success) {
                div.classList.add('copied');
                setTimeout(() => {
                    div.classList.remove('copied');
                }, 1000);
            }
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                // Reload the popup if the extension was updated
                window.location.reload();
                return;
            }
            console.error('Error copying text:', error);
        }
    });
    
    return div;
}

// Function to show error message
function showError(message) {
    const historyContainer = document.getElementById('clipboardHistory');
    historyContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'empty-message';
    errorDiv.textContent = `Error: ${message}. Try reloading the extension.`;
    historyContainer.appendChild(errorDiv);
}

// Function to update the history display
async function updateHistoryDisplay() {
    const historyContainer = document.getElementById('clipboardHistory');
    const statusElement = document.getElementById('status');
    
    try {
        statusElement.textContent = 'Loading...';
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({action: 'getHistory'}, resolve);
        });
        
        historyContainer.innerHTML = '';
        
        if (!response?.history || response.history.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No clipboard history yet. Copy some text to get started!';
            historyContainer.appendChild(emptyMessage);
            statusElement.textContent = 'Ready';
            return;
        }

        response.history.forEach(text => {
            historyContainer.appendChild(createHistoryItem(text));
        });
        statusElement.textContent = `${response.history.length} items`;
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            window.location.reload();
            return;
        }
        showError(error.message);
        statusElement.textContent = 'Error';
    }
}

// Update history when popup opens
document.addEventListener('DOMContentLoaded', updateHistoryDisplay);

// Listen for storage changes to update the display
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.clipboardHistory) {
        updateHistoryDisplay().catch(console.error);
    }
});
