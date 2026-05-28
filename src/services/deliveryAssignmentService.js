const DeliveryPartner = require("../config/models/DeliveryPartner");

const hasValidCoordinates = (coordinates) =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  Number.isFinite(coordinates[0]) &&
  Number.isFinite(coordinates[1]);

const findBestDeliveryPartner = async (restaurantCoordinates, excludePartnerIds = []) => {
  if (!hasValidCoordinates(restaurantCoordinates)) {
    return null;
  }

  const [longitude, latitude] = restaurantCoordinates;
  const excludedIds = excludePartnerIds.filter(Boolean);

  const matchQuery = {
    isAvailable: true,
  };
  if (excludedIds.length > 0) {
    matchQuery._id = { $nin: excludedIds };
  }

  const results = await DeliveryPartner.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        spherical: true,
        query: matchQuery,
      },
    },
    { $sort: { distance: 1, activeDeliveries: 1 } },
    { $limit: 1 },
  ]);

  return results[0] || null;
};

const assignPartnerToOrder = async (order, restaurantCoordinates, excludePartnerIds = []) => {
  const partner = await findBestDeliveryPartner(
    restaurantCoordinates,
    excludePartnerIds
  );

  if (!partner) {
    return { assigned: false, partner: null };
  }

  order.assignedDeliveryPartner = partner._id;
  await order.save();

  await DeliveryPartner.findByIdAndUpdate(partner._id, {
    $inc: { activeDeliveries: 1 },
  });

  return { assigned: true, partner };
};

const releasePartnerFromOrder = async (partnerId) => {
  if (!partnerId) return;

  await DeliveryPartner.findByIdAndUpdate(partnerId, {
    $inc: { activeDeliveries: -1 },
  });

  const partner = await DeliveryPartner.findById(partnerId);
  if (partner && partner.activeDeliveries < 0) {
    partner.activeDeliveries = 0;
    await partner.save();
  }
};

const getRestaurantCoordinates = (restaurant) => {
  const coordinates = restaurant?.location?.coordinates;
  return hasValidCoordinates(coordinates) ? coordinates : null;
};

module.exports = {
  findBestDeliveryPartner,
  assignPartnerToOrder,
  releasePartnerFromOrder,
  getRestaurantCoordinates,
  hasValidCoordinates,
};
