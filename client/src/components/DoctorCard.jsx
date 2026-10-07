import { Link } from "react-router";
import { clinicLabel, formatDayLabel, formatMoney } from "../lib/format";
import { Avatar, RatingText } from "./ui";
import { MapPin } from "lucide-react";

export function Price({ price, finalPrice, discount }) {
    if (!price) return <span className="muted small">Price on request</span>;
    return (
        <span className="price">
            {discount > 0 && <del>{formatMoney(price)}</del>}
            {formatMoney(finalPrice ?? price)}
        </span>
    );
}

export default function DoctorCard({ doctor }) {
    const profile = `/doctors/${doctor._id}`;
    return (
        <article className="card doctor-card">
            <Avatar src={doctor.photo} name={doctor.name} size={64} />
            <div className="stack-sm grow">
                <div>
                    <h3>
                        <Link to={profile}>Dr. {doctor.name}</Link>
                    </h3>
                    <div className="row-sm mt-1">
                        <span className="tag">{doctor.specialty}</span>
                        <RatingText average={doctor.ratingAverage} count={doctor.ratingCount} />
                    </div>
                </div>
                {doctor.clinic && (
                    <span className="muted small with-icon">
                        <MapPin aria-hidden="true" />
                        {clinicLabel(doctor.clinic)}
                    </span>
                )}
                {doctor.about && <p className="muted small clamp-2">{doctor.about}</p>}
            </div>
            <div className="side">
                <div>
                    <Price price={doctor.price} finalPrice={doctor.finalPrice} discount={doctor.discount} />
                    {doctor.discount > 0 && <div className="badge badge-success">{doctor.discount}% off</div>}
                </div>
                <span className="small muted">
                    {doctor.nextAvailableDate ? (
                        <>
                            Next available: <strong>{formatDayLabel(doctor.nextAvailableDate)}</strong>
                        </>
                    ) : (
                        "No open times yet"
                    )}
                </span>
                <Link to={profile} className="btn btn-primary btn-sm">
                    View &amp; book
                </Link>
            </div>
        </article>
    );
}

export function DoctorCardSkeleton() {
    return <div className="skeleton" style={{ height: 132 }} />;
}
