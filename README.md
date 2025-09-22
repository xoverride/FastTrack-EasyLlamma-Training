# FastTrack EasyLlama Training

⚠️ **WARNING - PROVIDED AS IS**

This automation script acts as a click bot that will attempt to click ALL buttons to advance to the next page. You should be prepared to explain to IT/HR/management why you have a <30% correct rate on answering training questions.

**DO NOT USE** if your training requires a correct answer rate for completion or compliance purposes.

An automation script for accelerating training completion on EasyLlama compliance training platforms.

## Overview

This JavaScript automation tool is designed to help users complete compliance training more efficiently by automating repetitive tasks like clicking through content, handling media playback, and answering standard quiz questions.

## Features

- **Smart Media Handling**: Automatically detects and speeds up audio/video content (up to 16x playback rate)
- **Quiz Automation**: Intelligent answer selection for compliance training questions
- **Drag & Drop Support**: Handles interactive quiz elements like federally protected characteristics categorization
- **Stealth Mode**: Includes anti-detection measures to avoid triggering platform safeguards
- **Cross-Frame Compatibility**: Works across different iframe configurations used by training platforms
- **Progress Tracking**: Monitors completion status and provides detailed statistics

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/FastTrack-EasyLlamma-Training.git
cd FastTrack-EasyLlamma-Training
```

2. Open the EasyLlama training platform in your browser
3. Open browser developer console (F12)
4. Copy and paste the contents of `EasyLlama.js` into the console

## Usage

### Recommended Setup

**For optimal performance, run in a Virtual Machine (VM) with disabled browser security:**

Tested with Windows VM and Chrome browser. Launch Chrome with security disabled:

```bash
# Windows
chrome.exe --disable-web-security --user-data-dir="C:\temp\chrome_dev"

# macOS
open -n -a /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir="/tmp/chrome_dev"
```

⚠️ **Security Warning**: Only use these browser flags in isolated environments (VMs) for automation purposes. Never browse other websites with these security settings disabled.

### Basic Commands

After loading the script, use these console commands:

```javascript
// Start automation (runs automatically on load)
EasyLlamaAuto.start();

// Stop automation
EasyLlamaAuto.stop();

// View current statistics
EasyLlamaAuto.stats();

// Debug current page state
EasyLlamaAuto.debug();

// Force navigation attempt
EasyLlamaAuto.forceNavigation();
```

### Configuration

The script includes configurable settings:

```javascript
const config = {
    playbackRate: 16,      // Media playback speed multiplier
    checkInterval: 800,    // Automation check frequency (ms)
    clickDelay: 300,       // Delay between clicks (ms)
    debug: true,          // Enable debug logging
    stealthMode: true     // Enable anti-detection features
};
```

## How It Works

### 1. Content Detection
- Automatically finds SCORM training content across multiple iframe configurations
- Searches for interactive elements, media, and quiz components

### 2. Media Acceleration
- Detects audio/video elements and increases playback speed
- Handles various media player implementations
- Automatically advances after media completion

### 3. Quiz Handling
- **Standard Quizzes**: Uses pattern matching for common compliance training questions
- **Drag & Drop**: Intelligent selection of federally protected characteristics
- **True/False**: Context-aware answer selection based on compliance best practices

### 4. Navigation
- Automatically clicks "Next", "Continue", and "Submit" buttons
- Handles course progression and section completion
- Resets state appropriately between sections

## Compliance Training Knowledge Base

The script includes built-in knowledge for common compliance topics:

- **Federally Protected Characteristics**: Age (40+), Race, Religion, Sex, Disability, National Origin, etc.
- **Harassment Prevention**: Automatic detection of appropriate responses
- **Workplace Policies**: Standard compliance training answer patterns

## Limitations

- Designed specifically for EasyLlama training platforms
- May require updates as platform interfaces change
- Should be used responsibly and in compliance with organizational policies
- Not guaranteed to work with all training module types

## Technical Details

- **Language**: JavaScript (ES6+)
- **Environment**: Browser console injection
- **Dependencies**: None (vanilla JavaScript)
- **Compatibility**: Modern browsers with ES6 support

## Troubleshooting

### Known Issues

1. **Page appears stuck/keeps refreshing**: This is due to internal video timers that must complete before the "Next" button appears. The script should automatically advance after the timer expires - just wait it out. Yes, it's hard to tell and annoying, but it worked for my training and I wasn't planning to make this production level. Good luck.

### Common Issues

1. **Script not working**: Ensure you're on an EasyLlama training page and have pasted the entire script
2. **Media not advancing**: Some platforms may have additional protections - try refreshing and reloading
3. **Quiz answers incorrect**: The knowledge base covers common patterns but may need updates for specific content

### Debug Information

Use `EasyLlamaAuto.debug()` to see:
- Available buttons and interactive elements
- Media elements detected
- Current quiz/question state
- Navigation options

## Disclaimer

This tool is intended for educational and efficiency purposes. Users should:
- Ensure compliance with organizational policies
- Use responsibly and ethically
- Verify completion of actual learning objectives
- Respect platform terms of service

## Credits

Based on community contributions from:
- https://www.reddit.com/r/chaoticgood/comments/1bp9vch/fuck_easyllamma_training_fast_forward_script/
- https://pastebin.com/yf1717s8

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

