const mongoose = require("mongoose");
const Order = require("../config/models/Order");
const DeliveryPartner = require("../config/models/DeliveryPartner");
const {
  assignPartnerToOrder,
  releasePartnerFromOrder,
  getRestaurantCoordinates,
} = require("../services/deliveryAssignmentService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isValidCoordinatePair = (longitude, latitude) =>
  Number.isFinite(longitude) &&
  Number.isFinite(latitude) &&
  longitude >= -180 &&
  longitude <= 180 &&
  latitude >= -90 &&
  latitude <= 90;

const getPartnerForUser = async (userId) =>
  DeliveryPartner.findOne({ user: userId });

exports.setStatus = async (req, res) => {
  try {
    const partner = await getPartnerForUser(req.user._id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    const { isAvailable, longitude, latitude } = req.body;

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isAvailable must be a boolean",
        });
      }
      partner.isAvailable = isAvailable;
    }

    if (longitude !== undefined || latitude !== undefined) {
      const lng = Number(longitude);
      const lat = Number(latitude);
      if (!isValidCoordinatePair(lng, lat)) {
        return res.status(400).json({
          success: false,
          message: "Valid longitude and latitude are required",
        });
      }
      partner.currentLocation = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Delivery partner status updated",
      data: partner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.declineOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const partner = await getPartnerForUser(req.user._id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    const order = await Order.findById(orderId).populate("restaurant");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      !order.assignedDeliveryPartner ||
      order.assignedDeliveryPartner.toString() !== partner._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    await releasePartnerFromOrder(partner._id);

    const alreadyDeclined = order.declinedDeliveryPartners.some(
      (partnerId) => partnerId.toString() === partner._id.toString()
    );
    if (!alreadyDeclined) {
      order.declinedDeliveryPartners.push(partner._id);
    }
    order.assignedDeliveryPartner = null;
    await order.save();

    const restaurantCoordinates = getRestaurantCoordinates(order.restaurant);
    if (!restaurantCoordinates) {
      return res.status(200).json({
        success: true,
        message:
          "Order declined. Restaurant location is not configured for reassignment",
        data: {
          order,
          reassigned: false,
        },
      });
    }

    const assignment = await assignPartnerToOrder(
      order,
      restaurantCoordinates,
      order.declinedDeliveryPartners
    );

    const updatedOrder = await Order.findById(orderId)
      .populate("assignedDeliveryPartner", "name phone isAvailable activeDeliveries currentLocation")
      .populate("restaurant", "name address city location");

    return res.status(200).json({
      success: true,
      message: assignment.assigned
        ? "Order declined and reassigned to another partner"
        : "Order declined. No other available delivery partners found",
      data: {
        order: updatedOrder,
        reassigned: assignment.assigned,
        newPartner: assignment.partner || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
