const  Appointment  = require("../models/appointmentModel");
const Doctor = require("../models/doctor/doctorModel");

class AppointmentRepository {
    async createAppointment(appointmentData) {
        const appointment = new Appointment(appointmentData);
        return await appointment.save();
    }

    async checkDoctorAvailability(doctorId, date, hour) {
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) return false;

        const availability = doctor.availability.find(
        (avail) =>{
            if(avail.date.toISOString().split("T")[0] ===date){
                return avail
            }
            return false
            }
        );
        
        if (!availability ) {
        return false;
        }
        const isAvailable = availability.hours.map(slot => {
            if (slot.start <= hour) {
                console.log('hour:', hour);
                console.log(slot.start)
                if (slot.isAvailable) return true;
            }
            return false;
        });
        if (!isAvailable) return false;

        const hourSlot = availability.hours.find(
            (slot) => slot.start <= hour && slot.end >= hour
        );
        if (!hourSlot || hourSlot.currentPatients >= hourSlot.maxPatients) {
        return false;
        }

        hourSlot.currentPatients += 1;
        await doctor.save();

        return true;
    }

    async getUpcomingAppointmentsByPatient(patientId) {
        return await Appointment.find({
        patient: patientId,
        appointmentDate: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] },
        })
        // .populate("doctor").select('name photo')
        // .sort("appointmentDate");
    }

    async getAppointmentsByDoctor(doctorId) {
        return await Appointment.find({ doctor: doctorId })
        .populate("patient")
        .sort("appointmentDate");
    }

    async updateAppointmentStatus(appointmentId, status) {
        return await Appointment.findByIdAndUpdate(
        appointmentId,
        { status },
        { new: true }
        );
    }

    async cancelAppointment(appointmentId) {
        return await Appointment.findByIdAndUpdate(
        appointmentId,
        { status: "canceled" },
        { new: true }
        );
    }

    async findAppointmentById(appointmentId) {
        return await Appointment.findById(appointmentId).populate("doctor");
    }

    async rescheduleAppointment(appointmentId, newDate, newHour) {
        return await Appointment.findByIdAndUpdate(
        appointmentId,
        {
            appointmentDate: newDate,
            appointmentHour: newHour,
            status: "pending",
        },
        { new: true }
        );
    }

    async getUpcomingAppointmentsWithin24Hours() {
        const currentDate = new Date();
        const next24Hours = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        return await Appointment.find({
        appointmentDate: { $gte: currentDate, $lt: next24Hours },
        status: { $in: ["pending", "confirmed"] },
        })
        .populate("patient doctor")
        .sort("appointmentDate");
    }
}

module.exports = new AppointmentRepository();

