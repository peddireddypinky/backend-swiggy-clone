const Menu = require("../config/models/Menu");
const Restaurant = require("../config/models/restaurant");

exports.addMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, image } = req.body;
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found for this user"
            });
        }

        const menuItem = await Menu.create({
            name,
            description,
            price,
            category,
            image,
            restaurant: restaurant._id
        });

        res.status(201).json({
            success: true,
            message: "Menu item added successfully",
            data: menuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding menu item",
            error: error.message
        });
    }
};

exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await Menu.findById(id).populate("restaurant");

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        if (menuItem.restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this menu item"
            });
        }

        const updatedItem = await Menu.findByIdAndUpdate(id, req.body, { new: true });

        res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            data: updatedItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating menu item",
            error: error.message
        });
    }
};

exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await Menu.findById(id).populate("restaurant");

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        if (menuItem.restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this menu item"
            });
        }

        await Menu.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Menu item deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting menu item",
            error: error.message
        });
    }
};

exports.getMenuByRestaurant = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        const menuItems = await Menu.find({ restaurant: id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: menuItems.length,
            data: menuItems
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching menu items",
            error: error.message
        });
    }
};
