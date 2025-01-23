// Initialize clipboard history
let clipboardHistory = [];

// Function to add new item to history
async function addToHistory(text) {
    try {
        if (!text) return;
        const newHistory = [
            text,
            ...clipboardHistory.filter(item => item !== text).slice(0, 19) // Keep last 20 unique items
        ];
        clipboardHistory = newHistory;
    } catch (error) {
        console.error('Error adding to history:', error);
    }
}

// Function to write to clipboard
async function writeToClipboard(text) {
    try {
        // Execute the copy in the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found');
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (textToCopy) => {
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            },
            args: [text]
        });

        return { success: true };
    } catch (error) {
        console.error('Error writing to clipboard:', error);
        return { success: false, error: error.message };
    }
}

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'getHistory') {
            sendResponse({ history: clipboardHistory });
        } else if (request.action === 'copyText') {
            writeToClipboard(request.text)
                .then(response => {
                    sendResponse(response);
                })
                .catch(error => {
                    console.error('Error in copyText:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        } else if (request.action === 'addToHistory') {
            addToHistory(request.text)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error adding to history:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }
    } catch (error) {
        console.error('Error in message handler:', error);
        sendResponse({ success: false, error: error.message });
        return true;
    }
});
