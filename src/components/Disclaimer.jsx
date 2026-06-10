export default function Disclaimer() {
  return (
    <p className="disclaimer">
      <strong>This is an estimate, not a warning.</strong> It blends terrain shape (~90 m
      data) with modelled river data (~5 km), so it reflects the general area, not your exact
      plot — don't rely on it for emergency decisions. For official alerts in Pakistan, see the{" "}
      <a href="https://www.ndma.gov.pk/" target="_blank" rel="noreferrer">
        NDMA
      </a>{" "}
      and{" "}
      <a href="https://www.pmd.gov.pk/" target="_blank" rel="noreferrer">
        Pakistan Met Department
      </a>
      .
    </p>
  );
}
