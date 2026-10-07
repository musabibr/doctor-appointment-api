const { toDateKey, todayKey, hasPassed } = require("../../shared/utils/time");

const finalPriceOf = (doctor) => {
    const price = doctor.price || 0;
    return Math.round(price * (1 - (doctor.discount || 0) / 100) * 100) / 100;
};

const serializeSlot = (slot, dateKey) => ({
    _id: String(slot._id),
    start: slot.start,
    end: slot.end,
    maxPatients: slot.maxPatients,
    booked: slot.currentPatients,
    remaining: Math.max(0, slot.maxPatients - slot.currentPatients),
    isPast: hasPassed(dateKey, slot.end),
});

const serializeDay = (day) => {
    const date = toDateKey(day.date);
    return {
        _id: String(day._id),
        date,
        slots: [...(day.hours || [])]
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((slot) => serializeSlot(slot, date)),
    };
};

// Days sorted by date; with upcomingOnly, days before today are dropped.
const serializeAvailability = (availability = [], { upcomingOnly = false } = {}) => {
    const today = todayKey();
    return availability
        .map(serializeDay)
        .filter((day) => !upcomingOnly || day.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
};

const nextAvailableDate = (availability = []) => {
    const day = serializeAvailability(availability, { upcomingOnly: true }).find((d) =>
        d.slots.some((slot) => slot.remaining > 0 && !slot.isPast)
    );
    return day ? day.date : null;
};

// Shape used in search results.
const toCard = (doctor) => ({
    _id: String(doctor._id),
    name: doctor.name,
    photo: doctor.photo || null,
    gender: doctor.gender,
    specialty: doctor.specialty,
    about: doctor.about || "",
    price: doctor.price || 0,
    discount: doctor.discount || 0,
    finalPrice: finalPriceOf(doctor),
    ratingAverage: doctor.ratingAverage || 0,
    ratingCount: doctor.ratingCount || 0,
    clinic: doctor.clinic || null,
    nextAvailableDate: nextAvailableDate(doctor.availability),
});

// Shape used on the public profile page.
const toPublicProfile = (doctor) => ({
    ...toCard(doctor),
    address: doctor.address,
    availability: serializeAvailability(doctor.availability, { upcomingOnly: true }),
});

// The doctor's own view of their account.
const toOwnProfile = (doctorDocument) => {
    const doctor = doctorDocument.toJSON();
    return {
        ...doctor,
        finalPrice: finalPriceOf(doctor),
        availability: serializeAvailability(doctorDocument.availability),
    };
};

module.exports = { finalPriceOf, serializeAvailability, serializeDay, toCard, toPublicProfile, toOwnProfile };
