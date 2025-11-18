const RoomInspection = require('../models/RoomInspection');

// Delete room inspection
const deleteRoomInspection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedInspection = await RoomInspection.findByIdAndDelete(id);
    
    if (!deletedInspection) {
      return res.status(404).json({ message: 'Room inspection not found' });
    }
    
    res.status(200).json({ 
      message: 'Room inspection deleted successfully',
      data: deletedInspection 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting room inspection', 
      error: error.message 
    });
  }
};

module.exports = {
  deleteRoomInspection
};