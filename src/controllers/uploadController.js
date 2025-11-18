const fs = require('fs');
const path = require('path');

// Handle base64 image uploads as a fallback for CORS issues
exports.uploadBase64Images = async (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images must be provided as an array' });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const imageUrls = await Promise.all(
      images.map(async (image) => {
        // Extract the base64 data
        const base64Data = image.base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `image-${timestamp}-${image.name}`;
        const filepath = path.join(uploadsDir, filename);
        
        // Write the file
        fs.writeFileSync(filepath, buffer);
        
        // Return the URL
        return `/uploads/${filename}`;
      })
    );
    
    res.json({ success: true, imageUrls });
  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ error: error.message });
  }
};