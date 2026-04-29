const CRYPTIC_PUMP_URL = 'https://CrypticPump.com'

export default function PartnerCard() {
  return (
    <>
      <style>{`
        .partner-card {
          margin-top: 18px;
          width: min(760px, 100%);
          display: grid;
          grid-template-columns: 132px minmax(0, 1fr);
          align-items: stretch;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(246, 211, 124, 0.24);
          background: linear-gradient(180deg, rgba(18, 14, 16, 0.82), rgba(8, 8, 10, 0.68));
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(12px);
          text-align: left;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }

        .partner-card:hover {
          transform: translateY(-1px);
          border-color: rgba(246, 211, 124, 0.42);
          background: linear-gradient(180deg, rgba(24, 18, 16, 0.9), rgba(8, 8, 10, 0.74));
        }

        .partner-card__image-wrap {
          position: relative;
          min-height: 132px;
          background: #000;
          overflow: hidden;
        }

        .partner-card__image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .partner-card__content {
          padding: 18px 18px 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .partner-card__eyebrow {
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(246, 211, 124, 0.24);
          background: rgba(246, 211, 124, 0.1);
          color: rgba(246, 211, 124, 0.96);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .partner-card__title {
          margin-top: 10px;
          font-size: 24px;
          font-weight: 900;
          color: rgba(255, 247, 235, 0.96);
        }

        .partner-card__text {
          margin-top: 5px;
          color: rgba(255, 247, 235, 0.74);
          line-height: 1.45;
        }

        @media (max-width: 640px) {
          .partner-card {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .partner-card__image-wrap {
            min-height: 190px;
          }

          .partner-card__content {
            align-items: center;
          }
        }
      `}</style>
      <a
        className="partner-card"
        href={CRYPTIC_PUMP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit CrypticPump, official MemeWarzone partner"
      >
        <div className="partner-card__image-wrap">
          <img className="partner-card__image" src="/crypticpump.jpg" alt="CrypticPump" />
        </div>
        <div className="partner-card__content">
          <div className="partner-card__eyebrow">Official Partner</div>
          <div className="partner-card__title">CrypticPump</div>
          <div className="partner-card__text">Get listed. Get seen. Join the warzone.</div>
        </div>
      </a>
    </>
  )
}
