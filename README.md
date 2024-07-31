# Browser History Helper - Use Auto-Generated Tags 🎈 to Help You Filter Your History

Browser History Helper is an extension that helps users better retrieve webpages from their browser history using Machine Learning models. Specifically, the model generates tags for your history items, allowing you to filter results more effectively. We also support customizing tags, enabling users to define their own tag sets to better suit their needs. Currently, we use a distilled BERT uncased model from 🤗 Transformers.

## Getting Started

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/ruinanxu/browser-history-helper.git
   cd browser-history-helper/
   ```

2. Install the necessary dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Add the extension to your browser:

   - Go to `chrome://extensions/`
   - Enable developer mode (top right)
   - Click "Load unpacked"
   - Select the `build` directory from the dialog that appears and click "Select Folder"

5. That's it! You should now be able to open the extension's popup and use the model in your browser!

## Editing the Template

We recommend running `npm run dev` while editing the template, as it will rebuild the project when changes are made.

All source code can be found in the `./src/` directory:

- `background.js` ([service worker](https://developer.chrome.com/docs/extensions/mv3/service_workers/)): Handles all requests from the UI, processes them in the background, and returns the results. You will need to reload the extension (by visiting `chrome://extensions/` and clicking the refresh button) after editing this file for changes to be visible in the extension.
- `content.js` ([content script](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)): Contains the code injected into every page the user visits. You can use the `sendMessage` API to make requests to the background script. Similarly, you will need to reload the extension after editing this file for changes to take effect.
- `popup.html`, `popup.css`, `popup.jsx` ([toolbar action](https://developer.chrome.com/docs/extensions/reference/action/)): Contains the code for the popup visible to the user when they click the extension's icon from the extensions bar. For development, we recommend opening the `popup.html` file in its own tab by visiting `chrome-extension://<ext_id>/popup.html` (remember to replace `<ext_id>` with the extension's ID). You will need to refresh the page while you develop to see the changes you make.
