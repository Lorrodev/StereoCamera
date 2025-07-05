# StereoCamera Extension

A Chrome extension for creating stereoscopic images from 3D web applications.

## Installation

### From Chrome Web Store

[Install StereoCamera](https://chrome.google.com/webstore) (Coming Soon)

### Manual Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Usage

1. Navigate to Google Maps, Sketchfab, or noclip.website
2. Click the StereoCamera extension icon
3. Adjust **Strafe** and **Rotation Amount** if needed
   - Higher values create stronger 3D effects but may reduce stability
4. Click "Capture Image" to create a stereoscopic image
5. Preview and download the result

## Supported Sites

- **[Google Maps](https://www.google.com/maps)**: Earth view with 3D buildings and topology
- **[Sketchfab](https://sketchfab.com)**: Online 3D model viewer
- **[noclip.website](https://noclip.website)**: Digital museum of video game levels

## Technical Details

The extension uses Chrome Extension Manifest V3 with minimal permissions:

- `activeTab`: Access to current tab for screenshot capture
- `scripting`: Inject content scripts for 3D application control

### Architecture

- **Background script**: Handles tab capture via Chrome API
- **Content scripts**: Controls camera movement
- **Floating UI**: Control panel overlay
- **Image processor**: Creates stereoscopic images from screenshots

## Privacy

StereoCamera respects your privacy:

- **No data collection** or user tracking
- **Local processing** - all images processed in your browser
- **No external servers** - everything works offline
- See [Privacy Policy](PRIVACY_POLICY.md) for details

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## Bug Reports

- Create an [issue](https://github.com/Lorrodev/StereoCamera/issues) for bug reports
- Check existing issues before creating new ones
- Provide detailed steps to reproduce any problems
