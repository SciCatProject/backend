/**
 * Seeds realistic ESS proposals and datasets for the first-day instruments
 * (DREAM, ODIN, ESTIA, LOKI, NMX, SKADI, BIFROST).
 *
 * 15 proposals, 5 datasets each (3 raw + 2 derived). Writes directly to MongoDB and
 * mirrors the side effects of the API create path: missing instruments are created,
 * proposal.numberOfDatasets is set, and MetadataKeys counters are upserted.
 *
 * Idempotent: proposals that already exist are skipped together with their datasets.
 *
 * Usage: node scripts/seed/seed-ess-proposals.js [mongoUri]
 */
const { MongoClient, ObjectId } = require("mongodb");
const { createHash, randomUUID } = require("crypto");

const MONGO_URI =
  process.argv[2] ??
  process.env.MONGODB_URI ??
  "mongodb://localhost:27017/scicat-test-db";
const PID_PREFIX = "scicat_testing";
const CREATED_BY = "admin";

// Deterministic UUID so re-runs produce the same PIDs
function stableUuid(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const SI = {
  K: [1, "K"],
  mK: [1e-3, "K"],
  deg: [Math.PI / 180, "rad"],
  angstrom: [1e-10, "m"],
  nm: [1e-9, "m"],
  mm: [1e-3, "m"],
  m: [1, "m"],
  um: [1e-6, "m"],
  bar: [1e5, "Pa"],
  kbar: [1e8, "Pa"],
  GPa: [1e9, "Pa"],
  T: [1, "T"],
  mT: [1e-3, "T"],
  meV: [1.602176634e-22, "J"],
  Hz: [1, "s^-1"],
  s: [1, "s"],
  min: [60, "s"],
  h: [3600, "s"],
  V: [1, "V"],
  mA: [1e-3, "A"],
  MW: [1e6, "W"],
};

// [value, unit, human_name] → SciCat scientificMetadata entry
function entry(value, unit = "", humanName) {
  const e = { value, unit, human_name: humanName };
  if (typeof value === "number" && SI[unit]) {
    e.valueSI = value * SI[unit][0];
    e.unitSI = SI[unit][1];
  }
  return e;
}

function toMetadata(spec) {
  return Object.fromEntries(
    Object.entries(spec).map(([k, [v, u, h]]) => [k, entry(v, u, h)]),
  );
}

// Instrument-level constants merged into every raw dataset
const INSTRUMENTS = {
  DREAM: {
    format: "NeXus",
    rawSize: [8e9, 25e9],
    software: ["ScippNeutron", "ess.dream", "GSAS-II"],
    meta: {
      instrument_mode: ["high_resolution", "", "Instrument Mode"],
      wavelength_band_min: [0.8, "angstrom", "Wavelength Band (min)"],
      wavelength_band_max: [3.6, "angstrom", "Wavelength Band (max)"],
      pulse_shaping_chopper_speed: [112, "Hz", "Pulse-Shaping Chopper Speed"],
      detector_banks: ["mantle, endcap_bw, endcap_fw, high_res", "", "Detector Banks"],
    },
  },
  ODIN: {
    format: "NeXus",
    rawSize: [20e9, 60e9],
    software: ["ess.imaging", "Tomopy", "iBeatles"],
    meta: {
      imaging_mode: ["wavelength_resolved", "", "Imaging Mode"],
      collimation_ratio_L_D: [300, "", "Collimation Ratio L/D"],
      pinhole_diameter: [20, "mm", "Pinhole Diameter"],
      detector: ["timepix3_mcp", "", "Detector"],
      pixel_size: [55, "um", "Pixel Size"],
      field_of_view: [28, "mm", "Field of View"],
    },
  },
  ESTIA: {
    format: "NeXus",
    rawSize: [1e9, 5e9],
    software: ["ess.estia", "refnx", "GenX"],
    meta: {
      focusing_mode: ["selene_focused", "", "Focusing Mode"],
      wavelength_band_min: [4, "angstrom", "Wavelength Band (min)"],
      wavelength_band_max: [10, "angstrom", "Wavelength Band (max)"],
      detector: ["multiblade_10B", "", "Detector"],
      beam_footprint: [10, "mm", "Beam Footprint"],
    },
  },
  LOKI: {
    format: "NeXus",
    rawSize: [2e9, 9e9],
    software: ["ess.loki", "SasView", "ScippNeutron"],
    meta: {
      collimation_length: [5, "m", "Collimation Length"],
      rear_detector_distance: [10, "m", "Rear Detector Distance"],
      wavelength_band_min: [3, "angstrom", "Wavelength Band (min)"],
      wavelength_band_max: [11.5, "angstrom", "Wavelength Band (max)"],
      source_aperture: [30, "mm", "Source Aperture"],
      sample_aperture: [10, "mm", "Sample Aperture"],
    },
  },
  NMX: {
    format: "NeXus",
    rawSize: [5e9, 15e9],
    software: ["ess.nmx", "DIALS", "phenix.refine"],
    meta: {
      detector_panels: [3, "", "Detector Panels"],
      detector_type: ["gd_gem_panel", "", "Detector Type"],
      wavelength_band_min: [1.8, "angstrom", "Wavelength Band (min)"],
      wavelength_band_max: [3.55, "angstrom", "Wavelength Band (max)"],
      goniometer: ["kappa_robot_arm", "", "Goniometer"],
    },
  },
  SKADI: {
    format: "NeXus",
    rawSize: [2e9, 8e9],
    software: ["ess.sans", "SasView", "Mantid"],
    meta: {
      collimation_length: [8, "m", "Collimation Length"],
      detector_distance: [8, "m", "Detector Distance"],
      wavelength_band_min: [3, "angstrom", "Wavelength Band (min)"],
      wavelength_band_max: [7.5, "angstrom", "Wavelength Band (max)"],
      detector: ["solid_state_scintillator", "", "Detector"],
      polarizer: ["out", "", "Polarizer"],
    },
  },
  BIFROST: {
    format: "NeXus",
    rawSize: [4e9, 12e9],
    software: ["ess.spectroscopy", "Horace", "SpinW"],
    meta: {
      analyser_final_energies: ["2.7, 3.2, 3.8, 4.4, 5.0", "meV", "Analyser Final Energies"],
      pulse_shaping_chopper_speed: [168, "Hz", "Pulse-Shaping Chopper Speed"],
      incident_wavelength_band: [1.7, "angstrom", "Incident Wavelength Band Width"],
      detector: ["triplet_he3_tubes", "", "Detector"],
      a4_coverage: [90, "deg", "Scattering Angle Coverage"],
    },
  },
};

/**
 * Each proposal: 3 raw runs (per-run scientific metadata) and 2 derived datasets.
 * derived.inputs are indices into runs.
 */
const PROPOSALS = [
  // ───────────────────────────── DREAM ─────────────────────────────
  {
    proposalId: "740213-1",
    instrument: "DREAM",
    title: "Magnetic ground state of the frustrated spinel ZnCr2O4 below the spin-Peierls transition",
    abstract:
      "ZnCr2O4 undergoes a first-order magnetostructural transition at 12.5 K that lifts the pyrochlore degeneracy. We will use DREAM's high-resolution mantle and backward endcap to resolve the tetragonal splitting and to refine the multi-k magnetic structure from temperature-dependent powder patterns between 1.5 K and 20 K.",
    pi: ["Ingrid", "Solberg", "ingrid.solberg@uio.no"],
    contact: ["Marek", "Nowicki", "marek.nowicki@uio.no"],
    start: "2025-10-06T08:00:00Z",
    days: 4,
    keywords: ["frustrated magnetism", "spinel", "magnetic structure"],
    sample: "ZnCr2O4 powder, 4.2 g, vanadium can Ø8 mm",
    runs: [
      { label: "ZnCr2O4, 20 K paramagnetic reference", meta: { sample_temperature: [20.0, "K", "Sample Temperature"], counting_time: [3.5, "h", "Counting Time"], proton_charge: [12.6, "mA", "Integrated Proton Charge"] } },
      { label: "ZnCr2O4, 10 K ordered phase", meta: { sample_temperature: [10.0, "K", "Sample Temperature"], counting_time: [6, "h", "Counting Time"], proton_charge: [21.4, "mA", "Integrated Proton Charge"] } },
      { label: "ZnCr2O4, 1.5 K base temperature", meta: { sample_temperature: [1.5, "K", "Sample Temperature"], counting_time: [8, "h", "Counting Time"], proton_charge: [28.9, "mA", "Integrated Proton Charge"] } },
    ],
    derived: [
      { name: "Focused d-spacing patterns, all temperatures", inputs: [0, 1, 2], meta: { focusing: ["per_bank", "", "Focusing"], d_min: [0.45, "angstrom", "d-spacing (min)"], d_max: [8.2, "angstrom", "d-spacing (max)"] } },
      { name: "Magnetic structure refinement, 1.5 K", inputs: [2], meta: { space_group: ["I4_1/amd", "", "Nuclear Space Group"], propagation_vectors: ["(1/2 1/2 0), (1 0 1/2)", "", "Propagation Vectors"], cr_moment: [2.05, "", "Cr Ordered Moment (μB)"], rwp: [5.8, "", "Rwp (%)"], chi2: [1.93, "", "Goodness of Fit χ²"] } },
    ],
  },
  {
    proposalId: "740588-2",
    instrument: "DREAM",
    title: "Operando structural evolution of Ni-rich NMC811 cathodes during the first charge",
    abstract:
      "Oxygen release and the H2→H3 phase transition limit the cycle life of LiNi0.8Mn0.1Co0.1O2. Using a pouch cell optimised for neutron transparency, we will follow lithium occupancy, Li/Ni antisite mixing and c-axis collapse operando on DREAM with 5-minute time resolution across the first charge to 4.4 V.",
    pi: ["Clara", "Hoffmann", "clara.hoffmann@kit.edu"],
    contact: ["Jonas", "Weber", "jonas.weber@kit.edu"],
    start: "2025-11-17T08:00:00Z",
    days: 3,
    keywords: ["battery", "operando", "NMC811", "lithium"],
    sample: "NMC811 || graphite pouch cell, 1.2 Ah, deuterated electrolyte",
    runs: [
      { label: "NMC811 pouch cell, pristine OCV", meta: { cell_voltage: [3.62, "V", "Cell Voltage"], c_rate: [0, "", "C-rate"], sample_temperature: [298, "K", "Sample Temperature"], counting_time: [60, "min", "Counting Time"] } },
      { label: "NMC811 operando charge 3.6–4.1 V", meta: { cell_voltage_start: [3.62, "V", "Cell Voltage (start)"], cell_voltage_end: [4.1, "V", "Cell Voltage (end)"], c_rate: [0.1, "", "C-rate"], time_slice: [5, "min", "Time Slice"], sample_temperature: [298, "K", "Sample Temperature"] } },
      { label: "NMC811 operando charge 4.1–4.4 V", meta: { cell_voltage_start: [4.1, "V", "Cell Voltage (start)"], cell_voltage_end: [4.4, "V", "Cell Voltage (end)"], c_rate: [0.1, "", "C-rate"], time_slice: [5, "min", "Time Slice"], sample_temperature: [298, "K", "Sample Temperature"] } },
    ],
    derived: [
      { name: "Time-sliced reduced patterns, first charge", inputs: [1, 2], meta: { number_of_slices: [118, "", "Number of Time Slices"], d_min: [0.6, "angstrom", "d-spacing (min)"], d_max: [5.0, "angstrom", "d-spacing (max)"] } },
      { name: "Sequential Rietveld refinement, lattice and Li occupancy", inputs: [0, 1, 2], meta: { space_group: ["R-3m", "", "Space Group"], c_axis_max: [14.47, "angstrom", "c Lattice Parameter (max)"], c_axis_collapse: [-4.9, "", "c-axis Collapse (%)"], li_ni_mixing: [2.3, "", "Li/Ni Antisite Mixing (%)"] } },
    ],
  },
  {
    proposalId: "741906-1",
    instrument: "DREAM",
    title: "Deuterium site occupancy in LaNi4.8Sn0.2 under variable D2 pressure",
    abstract:
      "Sn substitution in LaNi5 flattens the absorption plateau and improves cycling stability of hydrogen storage alloys. We will determine deuterium occupancy of the 3f, 6m and 12n interstitial sites along the absorption isotherm at 313 K using an in situ gas-loading cell on DREAM.",
    pi: ["Kenji", "Tanaka", "k.tanaka@aist.go.jp"],
    contact: ["Sofie", "Lindqvist", "sofie.lindqvist@ife.no"],
    start: "2026-02-09T08:00:00Z",
    days: 3,
    keywords: ["hydrogen storage", "metal hydride", "in situ"],
    sample: "LaNi4.8Sn0.2 powder, 6 g, stainless-steel gas cell",
    runs: [
      { label: "LaNi4.8Sn0.2, vacuum reference", meta: { d2_pressure: [0, "bar", "D2 Pressure"], sample_temperature: [313, "K", "Sample Temperature"], counting_time: [2, "h", "Counting Time"] } },
      { label: "LaNi4.8Sn0.2Dx, plateau 1.8 bar", meta: { d2_pressure: [1.8, "bar", "D2 Pressure"], sample_temperature: [313, "K", "Sample Temperature"], deuterium_content: [3.1, "", "D per Formula Unit"], counting_time: [3, "h", "Counting Time"] } },
      { label: "LaNi4.8Sn0.2Dx, saturated 12 bar", meta: { d2_pressure: [12, "bar", "D2 Pressure"], sample_temperature: [313, "K", "Sample Temperature"], deuterium_content: [5.9, "", "D per Formula Unit"], counting_time: [3, "h", "Counting Time"] } },
    ],
    derived: [
      { name: "Background-subtracted patterns, D2 isotherm", inputs: [0, 1, 2], meta: { cell_background_subtracted: [true, "", "Cell Background Subtracted"], d_min: [0.7, "angstrom", "d-spacing (min)"] } },
      { name: "Deuterium site occupancy refinement", inputs: [1, 2], meta: { space_group: ["P6/mmm", "", "Space Group"], occ_3f: [0.92, "", "Occupancy 3f"], occ_6m: [0.41, "", "Occupancy 6m"], occ_12n: [0.78, "", "Occupancy 12n"], volume_expansion: [24.1, "", "Unit-Cell Volume Expansion (%)"] } },
    ],
  },
  // ───────────────────────────── ODIN ─────────────────────────────
  {
    proposalId: "742350-3",
    instrument: "ODIN",
    title: "Bragg-edge strain mapping of additively manufactured Inconel 718 turbine brackets",
    abstract:
      "Laser powder-bed fusion leaves steep residual stress gradients near support structures. We will use ODIN's wavelength-resolved imaging to map lattice strain from the (111) and (200) Bragg edges across as-built and heat-treated Inconel 718 brackets at 100 µm spatial resolution, validating process simulations.",
    pi: ["Luca", "Bianchi", "luca.bianchi@polimi.it"],
    contact: ["Anna", "Kowalska", "anna.kowalska@polimi.it"],
    start: "2025-09-22T08:00:00Z",
    days: 4,
    keywords: ["Bragg edge", "residual stress", "additive manufacturing"],
    sample: "Inconel 718 LPBF brackets, 40 × 25 × 12 mm",
    runs: [
      { label: "IN718 stress-free reference cube", meta: { exposure_time: [2, "h", "Exposure Time"], sample_rotation: [0, "deg", "Sample Rotation"], time_of_flight_bins: [2400, "", "Time-of-Flight Bins"] } },
      { label: "IN718 bracket, as-built", meta: { exposure_time: [5, "h", "Exposure Time"], sample_rotation: [0, "deg", "Sample Rotation"], time_of_flight_bins: [2400, "", "Time-of-Flight Bins"], build_orientation: ["vertical", "", "Build Orientation"] } },
      { label: "IN718 bracket, stress-relieved 980 °C", meta: { exposure_time: [5, "h", "Exposure Time"], sample_rotation: [0, "deg", "Sample Rotation"], time_of_flight_bins: [2400, "", "Time-of-Flight Bins"], heat_treatment: ["980C_1h_AC", "", "Heat Treatment"] } },
    ],
    derived: [
      { name: "Normalised transmission spectra stack", inputs: [0, 1, 2], meta: { open_beam_normalised: [true, "", "Open-Beam Normalised"], dark_current_corrected: [true, "", "Dark-Current Corrected"] } },
      { name: "Bragg-edge strain maps (111) and (200)", inputs: [1, 2], meta: { macro_pixel: [100, "um", "Macro-Pixel Size"], strain_max_as_built: [2850, "", "Max Strain As-Built (µε)"], strain_max_relieved: [420, "", "Max Strain Relieved (µε)"], strain_uncertainty: [85, "", "Strain Uncertainty (µε)"] } },
    ],
  },
  {
    proposalId: "743011-1",
    instrument: "ODIN",
    title: "Root water uptake dynamics in drought-stressed maize by neutron tomography",
    abstract:
      "Rhizosphere mucilage controls how roots access water during drying. Using D2O tracer infiltration and fast neutron tomography on ODIN, we will quantify three-dimensional water redistribution around maize roots in sandy soil during a 72-hour drought and rewetting cycle.",
    pi: ["Maria", "Carvalho", "maria.carvalho@uni-goettingen.de"],
    contact: ["Tobias", "Brandt", "tobias.brandt@uni-goettingen.de"],
    start: "2026-03-16T08:00:00Z",
    days: 4,
    keywords: ["neutron tomography", "plant physiology", "rhizosphere"],
    sample: "Zea mays, 14 days, aluminium column Ø27 mm, sandy loam",
    runs: [
      { label: "Maize column, well-watered tomogram", meta: { projections: [625, "", "Number of Projections"], exposure_per_projection: [8, "s", "Exposure per Projection"], soil_water_content: [0.21, "", "Volumetric Water Content"] } },
      { label: "Maize column, drought day 3 tomogram", meta: { projections: [625, "", "Number of Projections"], exposure_per_projection: [8, "s", "Exposure per Projection"], soil_water_content: [0.07, "", "Volumetric Water Content"] } },
      { label: "Maize column, D2O rewetting time series", meta: { imaging_mode_override: ["white_beam_radiography", "", "Acquisition Mode"], frame_rate: [2, "Hz", "Frame Rate"], d2o_volume: [4, "", "D2O Injected (mL)"], duration: [45, "min", "Acquisition Duration"] } },
    ],
    derived: [
      { name: "Reconstructed tomograms, well-watered and drought", inputs: [0, 1], meta: { reconstruction: ["FBP_tomopy", "", "Reconstruction Algorithm"], voxel_size: [55, "um", "Voxel Size"], ring_artefact_correction: [true, "", "Ring Artefact Correction"] } },
      { name: "Segmented root system and water content maps", inputs: [0, 1, 2], meta: { root_length_density: [1.84, "", "Root Length Density (cm/cm³)"], rhizosphere_thickness: [0.9, "mm", "Rhizosphere Thickness"], d2o_uptake_rate: [0.12, "", "D2O Uptake Rate (cm/h)"] } },
    ],
  },
  // ───────────────────────────── ESTIA ─────────────────────────────
  {
    proposalId: "744127-2",
    instrument: "ESTIA",
    title: "Insertion of the antimicrobial peptide LL-37 into asymmetric supported lipid bilayers",
    abstract:
      "Bacterial outer membranes are strongly asymmetric. We will prepare POPE/POPG asymmetric bilayers on silicon and use ESTIA's focusing geometry on 10 × 10 mm substrates to follow LL-37 insertion depth and lipid flip-flop in three solvent contrasts.",
    pi: ["Emma", "Richardson", "e.richardson@ucl.ac.uk"],
    contact: ["Henrik", "Dahl", "henrik.dahl@lu.se"],
    start: "2025-12-01T08:00:00Z",
    days: 3,
    keywords: ["reflectometry", "lipid bilayer", "antimicrobial peptide"],
    sample: "d-POPE/POPG asymmetric bilayer on Si(111), 10 × 10 mm",
    runs: [
      { label: "Bilayer before peptide, D2O contrast", meta: { solvent_contrast: ["D2O", "", "Solvent Contrast"], angle_of_incidence: [0.8, "deg", "Angle of Incidence"], sample_temperature: [310, "K", "Sample Temperature"], counting_time: [20, "min", "Counting Time"] } },
      { label: "Bilayer + 2 µM LL-37, D2O contrast", meta: { solvent_contrast: ["D2O", "", "Solvent Contrast"], peptide_concentration: [2, "", "LL-37 Concentration (µM)"], angle_of_incidence: [0.8, "deg", "Angle of Incidence"], sample_temperature: [310, "K", "Sample Temperature"], counting_time: [20, "min", "Counting Time"] } },
      { label: "Bilayer + 2 µM LL-37, CM4 contrast", meta: { solvent_contrast: ["CM4 (66% D2O)", "", "Solvent Contrast"], peptide_concentration: [2, "", "LL-37 Concentration (µM)"], angle_of_incidence: [0.8, "deg", "Angle of Incidence"], sample_temperature: [310, "K", "Sample Temperature"], counting_time: [30, "min", "Counting Time"] } },
    ],
    derived: [
      { name: "Reduced reflectivity curves R(Q), three contrasts", inputs: [0, 1, 2], meta: { q_min: [0.008, "", "Q min (Å⁻¹)"], q_max: [0.25, "", "Q max (Å⁻¹)"], resolution_dq_q: [4, "", "Resolution dQ/Q (%)"] } },
      { name: "Co-refined slab model, LL-37 insertion", inputs: [1, 2], meta: { model: ["asymmetric_bilayer_5_slab", "", "Model"], peptide_insertion_depth: [11.5, "angstrom", "Peptide Insertion Depth"], outer_leaflet_pg_fraction: [0.34, "", "Outer-Leaflet POPG Fraction"], chi2: [1.41, "", "Goodness of Fit χ²"] } },
    ],
  },
  {
    proposalId: "744690-1",
    instrument: "ESTIA",
    title: "Magnetic depth profile of CoFeB/MgO/CoFeB tunnel junctions after annealing",
    abstract:
      "Boron diffusion into MgO during annealing degrades tunnelling magnetoresistance. Polarised neutron reflectometry on ESTIA will resolve the magnetisation profile and interfacial dead layers of CoFeB/MgO/CoFeB stacks as-deposited and after 300 °C and 400 °C anneals.",
    pi: ["Hiroshi", "Sato", "h.sato@tohoku.ac.jp"],
    contact: ["Rebecca", "Müller", "rebecca.mueller@fz-juelich.de"],
    start: "2026-01-19T08:00:00Z",
    days: 3,
    keywords: ["polarised neutron reflectometry", "spintronics", "thin films"],
    sample: "Ta/CoFeB(1.2 nm)/MgO(2 nm)/CoFeB(1.6 nm)/Ta on Si/SiO2",
    runs: [
      { label: "MTJ as-deposited, spin-up/down, 0.5 T", meta: { applied_field: [0.5, "T", "Applied Field"], polarization: ["uu, dd", "", "Spin Channels"], sample_temperature: [300, "K", "Sample Temperature"], angle_of_incidence: [0.6, "deg", "Angle of Incidence"] } },
      { label: "MTJ annealed 300 °C, spin-up/down, 0.5 T", meta: { applied_field: [0.5, "T", "Applied Field"], polarization: ["uu, dd", "", "Spin Channels"], anneal_temperature: [573, "K", "Anneal Temperature"], sample_temperature: [300, "K", "Sample Temperature"] } },
      { label: "MTJ annealed 400 °C, spin-up/down, 0.5 T", meta: { applied_field: [0.5, "T", "Applied Field"], polarization: ["uu, dd", "", "Spin Channels"], anneal_temperature: [673, "K", "Anneal Temperature"], sample_temperature: [300, "K", "Sample Temperature"] } },
    ],
    derived: [
      { name: "Polarisation-corrected reflectivities R++ and R--", inputs: [0, 1, 2], meta: { flipping_ratio: [48, "", "Flipping Ratio"], polarisation_efficiency: [0.985, "", "Polarisation Efficiency"] } },
      { name: "Magnetic depth profile fits, anneal series", inputs: [0, 1, 2], meta: { dead_layer_as_deposited: [0.42, "nm", "Dead Layer (as-deposited)"], dead_layer_400C: [0.18, "nm", "Dead Layer (400 °C)"], cofeb_moment: [1.52, "T", "CoFeB Saturation Magnetisation"], chi2: [1.27, "", "Goodness of Fit χ²"] } },
    ],
  },
  // ───────────────────────────── LOKI ─────────────────────────────
  {
    proposalId: "745233-4",
    instrument: "LOKI",
    title: "Kinetics of block copolymer micelle formation by stopped-flow SANS",
    abstract:
      "The early stages of PEO-PPO-PEO micellisation after a solvent quench occur within tens of milliseconds. LOKI's broad simultaneous Q range combined with a stopped-flow cell will capture micelle nucleation, growth and fusion/fission regimes with 20 ms time resolution.",
    pi: ["Pieter", "de Vries", "p.devries@tudelft.nl"],
    contact: ["Laura", "Santos", "laura.santos@tudelft.nl"],
    start: "2025-10-27T08:00:00Z",
    days: 3,
    keywords: ["SANS", "self-assembly", "time-resolved", "block copolymer"],
    sample: "Pluronic P85, 2 wt% in D2O/d-ethanol",
    runs: [
      { label: "P85 equilibrium micelles, 298 K", meta: { concentration: [2, "", "Concentration (wt%)"], sample_temperature: [298, "K", "Sample Temperature"], counting_time: [15, "min", "Counting Time"] } },
      { label: "P85 stopped-flow quench, 50 repetitions", meta: { concentration: [2, "", "Concentration (wt%)"], mixing_dead_time: [4, "", "Mixing Dead Time (ms)"], time_frame: [20, "", "Time Frame (ms)"], repetitions: [50, "", "Stopped-Flow Repetitions"] } },
      { label: "P85 stopped-flow quench, 318 K", meta: { concentration: [2, "", "Concentration (wt%)"], sample_temperature: [318, "K", "Sample Temperature"], time_frame: [20, "", "Time Frame (ms)"], repetitions: [50, "", "Stopped-Flow Repetitions"] } },
    ],
    derived: [
      { name: "Time-binned I(Q) after solvent quench", inputs: [1, 2], meta: { q_min: [0.003, "", "Q min (Å⁻¹)"], q_max: [0.6, "", "Q max (Å⁻¹)"], absolute_scale: [true, "", "Absolute Scale"], time_bins: [150, "", "Time Bins"] } },
      { name: "Core-shell micelle model fits vs time", inputs: [0, 1, 2], meta: { model: ["core_shell_sphere + hard_sphere_sq", "", "Model"], core_radius_final: [4.6, "nm", "Core Radius (final)"], aggregation_number_final: [52, "", "Aggregation Number (final)"], growth_time_constant: [0.38, "s", "Growth Time Constant"] } },
    ],
  },
  {
    proposalId: "745870-2",
    instrument: "LOKI",
    title: "Operando SANS of polysulfide deposition in lithium–sulfur battery cathodes",
    abstract:
      "Li2S deposition inside mesoporous carbon hosts governs Li–S capacity fade. Using a contrast-matched operando cell on LOKI, we will monitor pore filling and Li2S particle growth during discharge at C/10 and C/2.",
    pi: ["Anders", "Nilsson", "anders.nilsson@chalmers.se"],
    contact: ["Wei", "Zhang", "wei.zhang@chalmers.se"],
    start: "2026-04-13T08:00:00Z",
    days: 4,
    keywords: ["SANS", "lithium-sulfur", "operando", "mesoporous carbon"],
    sample: "S/CMK-3 cathode, Li anode, deuterated DOL/DME electrolyte",
    runs: [
      { label: "Li–S cell pristine, carbon contrast-matched", meta: { cell_voltage: [2.38, "V", "Cell Voltage"], c_rate: [0, "", "C-rate"], counting_time: [30, "min", "Counting Time"] } },
      { label: "Li–S operando discharge, C/10", meta: { cell_voltage_start: [2.38, "V", "Cell Voltage (start)"], cell_voltage_end: [1.7, "V", "Cell Voltage (end)"], c_rate: [0.1, "", "C-rate"], time_slice: [2, "min", "Time Slice"] } },
      { label: "Li–S operando discharge, C/2", meta: { cell_voltage_start: [2.38, "V", "Cell Voltage (start)"], cell_voltage_end: [1.7, "V", "Cell Voltage (end)"], c_rate: [0.5, "", "C-rate"], time_slice: [1, "min", "Time Slice"] } },
    ],
    derived: [
      { name: "Reduced I(Q) time series, both discharge rates", inputs: [1, 2], meta: { q_min: [0.004, "", "Q min (Å⁻¹)"], q_max: [0.4, "", "Q max (Å⁻¹)"], absolute_scale: [true, "", "Absolute Scale"] } },
      { name: "Pore-filling and Li2S particle size analysis", inputs: [0, 1, 2], meta: { mesopore_bragg_peak: [0.068, "", "Mesopore Peak Q (Å⁻¹)"], pore_filling_end_C10: [0.71, "", "Pore Filling Fraction (C/10)"], pore_filling_end_C2: [0.46, "", "Pore Filling Fraction (C/2)"], li2s_radius: [3.8, "nm", "Li2S Particle Radius"] } },
    ],
  },
  // ───────────────────────────── NMX ─────────────────────────────
  {
    proposalId: "746402-1",
    instrument: "NMX",
    title: "Protonation states in SARS-CoV-2 main protease bound to a covalent nitrile inhibitor",
    abstract:
      "The catalytic Cys145–His41 dyad of Mpro changes protonation on inhibitor binding. We will collect room-temperature neutron data from perdeuterated Mpro crystals in complex with nirmatrelvir to directly visualise the thioimidate adduct and the His41 protonation state.",
    pi: ["Daniel", "Kovacs", "daniel.kovacs@embl-hamburg.de"],
    contact: ["Ulrike", "Brandl", "ulrike.brandl@embl-hamburg.de"],
    start: "2025-11-03T08:00:00Z",
    days: 5,
    keywords: ["neutron crystallography", "protease", "drug design", "protonation"],
    sample: "Perdeuterated Mpro–nirmatrelvir, crystal volume 0.9 mm³",
    runs: [
      { label: "Mpro–nirmatrelvir, orientation 1", meta: { crystal_volume: [0.9, "", "Crystal Volume (mm³)"], phi_start: [0, "deg", "φ Start"], exposure_time: [4, "h", "Exposure per Orientation"], sample_temperature: [293, "K", "Sample Temperature"] } },
      { label: "Mpro–nirmatrelvir, orientation 2", meta: { crystal_volume: [0.9, "", "Crystal Volume (mm³)"], phi_start: [25, "deg", "φ Start"], exposure_time: [4, "h", "Exposure per Orientation"], sample_temperature: [293, "K", "Sample Temperature"] } },
      { label: "Mpro–nirmatrelvir, orientation 3", meta: { crystal_volume: [0.9, "", "Crystal Volume (mm³)"], phi_start: [50, "deg", "φ Start"], exposure_time: [4, "h", "Exposure per Orientation"], sample_temperature: [293, "K", "Sample Temperature"] } },
    ],
    derived: [
      { name: "Integrated and scaled reflections, merged", inputs: [0, 1, 2], meta: { space_group: ["C2", "", "Space Group"], resolution: [2.2, "angstrom", "Resolution"], completeness: [87.4, "", "Completeness (%)"], r_merge: [0.162, "", "Rmerge"], i_over_sigma: [5.1, "", "Mean I/σ(I)"] } },
      { name: "Joint X-ray/neutron refined model", inputs: [0, 1, 2], meta: { r_work: [0.196, "", "Rwork"], r_free: [0.241, "", "Rfree"], his41_state: ["doubly protonated (HIP)", "", "His41 Protonation State"], pdb_deposition: ["pending", "", "PDB Deposition"] } },
    ],
  },
  {
    proposalId: "747119-3",
    instrument: "NMX",
    title: "Proton transfer pathway in perdeuterated photoactive yellow protein intermediates",
    abstract:
      "Photoactive yellow protein's pB intermediate involves proton transfer from Glu46 to the chromophore. Cryo-trapped ground and illuminated states of perdeuterated PYP will be measured on NMX to locate every hydrogen along the short hydrogen bond network.",
    pi: ["Rachel", "Goldberg", "r.goldberg@weizmann.ac.il"],
    contact: ["Mikael", "Eriksson", "mikael.eriksson@lu.se"],
    start: "2026-05-04T08:00:00Z",
    days: 5,
    keywords: ["neutron crystallography", "photoreceptor", "hydrogen bond"],
    sample: "Perdeuterated PYP, crystal volume 1.4 mm³",
    runs: [
      { label: "PYP dark state, 100 K", meta: { crystal_volume: [1.4, "", "Crystal Volume (mm³)"], sample_temperature: [100, "K", "Sample Temperature"], illumination: ["dark", "", "Illumination"], exposure_time: [3, "h", "Exposure per Orientation"] } },
      { label: "PYP cryo-trapped pB, 100 K", meta: { crystal_volume: [1.4, "", "Crystal Volume (mm³)"], sample_temperature: [100, "K", "Sample Temperature"], illumination: ["460 nm, 200 K trap", "", "Illumination"], exposure_time: [3, "h", "Exposure per Orientation"] } },
      { label: "PYP dark state, room temperature", meta: { crystal_volume: [1.4, "", "Crystal Volume (mm³)"], sample_temperature: [293, "K", "Sample Temperature"], illumination: ["dark", "", "Illumination"], exposure_time: [5, "h", "Exposure per Orientation"] } },
    ],
    derived: [
      { name: "Merged reflections, dark and pB states", inputs: [0, 1], meta: { space_group: ["P6_3", "", "Space Group"], resolution: [1.6, "angstrom", "Resolution"], completeness: [92.8, "", "Completeness (%)"], i_over_sigma: [7.3, "", "Mean I/σ(I)"] } },
      { name: "Nuclear density maps and refined models", inputs: [0, 1, 2], meta: { r_work: [0.172, "", "Rwork"], r_free: [0.209, "", "Rfree"], glu46_od_distance: [2.51, "angstrom", "Glu46–pCA O···O Distance"], deuterium_on_chromophore: [true, "", "D Observed on Chromophore"] } },
    ],
  },
  // ───────────────────────────── SKADI ─────────────────────────────
  {
    proposalId: "748036-2",
    instrument: "SKADI",
    title: "Hierarchical structure of cellulose nanofibril hydrogels under uniaxial strain",
    abstract:
      "Anisotropic cellulose nanofibril networks are candidates for load-bearing tissue scaffolds. SKADI's combined SANS/VSANS range and an in situ tensile rig will follow fibril alignment and bundle spacing from 1 nm to 1 µm during stretching to 60% strain.",
    pi: ["Johanna", "Virtanen", "johanna.virtanen@aalto.fi"],
    contact: ["Oskar", "Lund", "oskar.lund@kth.se"],
    start: "2025-12-08T08:00:00Z",
    days: 3,
    keywords: ["SANS", "cellulose", "hydrogel", "in situ mechanics"],
    sample: "TEMPO-oxidised CNF hydrogel, 1.5 wt% in D2O",
    runs: [
      { label: "CNF hydrogel, unstrained", meta: { strain: [0, "", "Engineering Strain (%)"], sample_thickness: [2, "mm", "Sample Thickness"], counting_time: [20, "min", "Counting Time"] } },
      { label: "CNF hydrogel, 30% strain", meta: { strain: [30, "", "Engineering Strain (%)"], strain_rate: [0.01, "", "Strain Rate (s⁻¹)"], sample_thickness: [1.7, "mm", "Sample Thickness"], counting_time: [20, "min", "Counting Time"] } },
      { label: "CNF hydrogel, 60% strain", meta: { strain: [60, "", "Engineering Strain (%)"], strain_rate: [0.01, "", "Strain Rate (s⁻¹)"], sample_thickness: [1.4, "mm", "Sample Thickness"], counting_time: [20, "min", "Counting Time"] } },
    ],
    derived: [
      { name: "2D anisotropic scattering patterns, reduced", inputs: [0, 1, 2], meta: { q_min: [0.0008, "", "Q min (Å⁻¹)"], q_max: [0.5, "", "Q max (Å⁻¹)"], azimuthal_sectors: [36, "", "Azimuthal Sectors"] } },
      { name: "Orientation parameter and fibril radius vs strain", inputs: [0, 1, 2], meta: { hermans_orientation_60pct: [0.54, "", "Hermans Orientation (60%)"], fibril_radius: [1.9, "nm", "Fibril Radius"], bundle_spacing_60pct: [48, "nm", "Bundle Spacing (60%)"] } },
    ],
  },
  {
    proposalId: "748752-1",
    instrument: "SKADI",
    title: "Polarised SANS of flux-closure states in magnetite nanoparticle assemblies",
    abstract:
      "Close-packed Fe3O4 nanoparticle assemblies form collective magnetic textures. Using SKADI's polarised option with half-polarised analysis, we will separate nuclear and magnetic scattering to determine the magnetic correlation length and canted surface spin shell as a function of field.",
    pi: ["Sebastian", "Krüger", "s.krueger@helmholtz-berlin.de"],
    contact: ["Paula", "Ferreira", "paula.ferreira@ua.pt"],
    start: "2026-06-15T08:00:00Z",
    days: 4,
    keywords: ["polarised SANS", "magnetic nanoparticles", "magnetite"],
    sample: "Oleic-acid-capped Fe3O4, d = 12 nm, dense powder in Al cell",
    runs: [
      { label: "Fe3O4 NPs, remanence, 10 K", meta: { applied_field: [0.005, "T", "Applied Field"], sample_temperature: [10, "K", "Sample Temperature"], polarizer_state: ["in, flipper on/off", "", "Polarisation State"], counting_time: [40, "min", "Counting Time"] } },
      { label: "Fe3O4 NPs, 0.1 T, 10 K", meta: { applied_field: [0.1, "T", "Applied Field"], sample_temperature: [10, "K", "Sample Temperature"], polarizer_state: ["in, flipper on/off", "", "Polarisation State"], counting_time: [40, "min", "Counting Time"] } },
      { label: "Fe3O4 NPs, 1.5 T saturation, 10 K", meta: { applied_field: [1.5, "T", "Applied Field"], sample_temperature: [10, "K", "Sample Temperature"], polarizer_state: ["in, flipper on/off", "", "Polarisation State"], counting_time: [40, "min", "Counting Time"] } },
    ],
    derived: [
      { name: "Spin-resolved I+(Q) and I-(Q), field series", inputs: [0, 1, 2], meta: { flipping_ratio: [32, "", "Flipping Ratio"], q_min: [0.002, "", "Q min (Å⁻¹)"], q_max: [0.3, "", "Q max (Å⁻¹)"] } },
      { name: "Magnetic form factor and correlation length fits", inputs: [0, 1, 2], meta: { magnetic_core_radius: [5.2, "nm", "Magnetic Core Radius"], canted_shell_thickness: [0.8, "nm", "Canted Shell Thickness"], magnetic_correlation_length_remanence: [34, "nm", "Magnetic Correlation Length (remanence)"] } },
    ],
  },
  // ───────────────────────────── BIFROST ─────────────────────────────
  {
    proposalId: "749315-2",
    instrument: "BIFROST",
    title: "Field-induced magnon breakdown in the Kitaev candidate α-RuCl3",
    abstract:
      "Above 7.5 T in-plane field α-RuCl3 enters a disordered phase debated to host a Kitaev spin liquid. BIFROST's high flux and extreme-environment capability will map the low-energy magnon spectrum at the M-point across the field-induced transition up to 10 T at 1.5 K.",
    pi: ["Olivia", "Grant", "olivia.grant@ox.ac.uk"],
    contact: ["Niels", "Christensen", "niels.christensen@nbi.ku.dk"],
    start: "2026-01-26T08:00:00Z",
    days: 5,
    keywords: ["inelastic neutron scattering", "Kitaev", "quantum spin liquid", "magnon"],
    sample: "Co-aligned α-RuCl3 single crystals, 1.1 g, (H,K,0) plane",
    runs: [
      { label: "α-RuCl3, 0 T, 1.5 K, zigzag phase", meta: { applied_field: [0, "T", "Applied Field"], sample_temperature: [1.5, "K", "Sample Temperature"], rotation_range: [90, "deg", "Sample Rotation Range"], rotation_step: [1, "deg", "Rotation Step"] } },
      { label: "α-RuCl3, 7 T in-plane, 1.5 K", meta: { applied_field: [7, "T", "Applied Field"], field_direction: ["[1 -1 0]", "", "Field Direction"], sample_temperature: [1.5, "K", "Sample Temperature"], rotation_range: [90, "deg", "Sample Rotation Range"] } },
      { label: "α-RuCl3, 10 T in-plane, 1.5 K", meta: { applied_field: [10, "T", "Applied Field"], field_direction: ["[1 -1 0]", "", "Field Direction"], sample_temperature: [1.5, "K", "Sample Temperature"], rotation_range: [90, "deg", "Sample Rotation Range"] } },
    ],
    derived: [
      { name: "S(Q,ω) 4D histograms, field series", inputs: [0, 1, 2], meta: { energy_transfer_min: [-0.5, "meV", "Energy Transfer (min)"], energy_transfer_max: [8, "meV", "Energy Transfer (max)"], energy_resolution: [0.09, "meV", "Elastic Energy Resolution"] } },
      { name: "Linear spin-wave fits, K-Γ-J model", inputs: [0, 1, 2], meta: { kitaev_K: [-6.8, "meV", "Kitaev Coupling K"], gamma: [6.6, "meV", "Off-diagonal Γ"], heisenberg_J1: [-1.5, "meV", "Heisenberg J1"], m_point_gap_10T: [2.1, "meV", "M-point Gap at 10 T"] } },
    ],
  },
  {
    proposalId: "749987-1",
    instrument: "BIFROST",
    title: "Quantum critical spin dynamics of the Ising chain CoNb2O6 under hydrostatic pressure",
    abstract:
      "CoNb2O6 realises the transverse-field Ising chain with an E8 bound-state spectrum near criticality. Combining BIFROST with a clamp pressure cell, we will test how pressure tunes the interchain coupling and the domain-wall kinetic energy that sets the critical field.",
    pi: ["Radu", "Popescu", "radu.popescu@psi.ch"],
    contact: ["Freya", "Andersen", "freya.andersen@ess.eu"],
    start: "2026-07-06T08:00:00Z",
    days: 5,
    keywords: ["inelastic neutron scattering", "Ising chain", "high pressure", "quantum criticality"],
    sample: "CoNb2O6 single crystal, 0.8 g, CuBe clamp cell",
    runs: [
      { label: "CoNb2O6, ambient pressure, 0 T, 0.3 K", meta: { pressure: [0, "GPa", "Hydrostatic Pressure"], sample_temperature: [0.3, "K", "Sample Temperature"], applied_field: [0, "T", "Applied Field"], sample_environment: ["He-3 insert", "", "Sample Environment"] } },
      { label: "CoNb2O6, 0.9 GPa, 0 T, 0.3 K", meta: { pressure: [0.9, "GPa", "Hydrostatic Pressure"], sample_temperature: [0.3, "K", "Sample Temperature"], applied_field: [0, "T", "Applied Field"], pressure_medium: ["Daphne 7373", "", "Pressure Medium"] } },
      { label: "CoNb2O6, 0.9 GPa, 5.2 T transverse, 0.3 K", meta: { pressure: [0.9, "GPa", "Hydrostatic Pressure"], sample_temperature: [0.3, "K", "Sample Temperature"], applied_field: [5.2, "T", "Applied Field"], field_direction: ["b-axis", "", "Field Direction"] } },
    ],
    derived: [
      { name: "Pressure-cell-subtracted S(Q,ω) along chain", inputs: [0, 1, 2], meta: { cell_subtracted: [true, "", "Pressure Cell Subtracted"], energy_transfer_max: [4, "meV", "Energy Transfer (max)"], energy_resolution: [0.05, "meV", "Elastic Energy Resolution"] } },
      { name: "Domain-wall continuum and bound-state analysis", inputs: [1, 2], meta: { interchain_coupling_ratio: [0.021, "", "Interchain / Intrachain Coupling"], e8_mass_ratio_m2_m1: [1.61, "", "E8 Mass Ratio m2/m1"], critical_field_estimate: [5.0, "T", "Estimated Critical Field"] } },
    ],
  },
];

const HOUR = 3600 * 1000;

function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function lifecycle() {
  const now = new Date();
  return {
    _id: new ObjectId(),
    archivable: true,
    retrievable: false,
    publishable: false,
    dateOfDiskPurging: now,
    archiveRetentionTime: now,
    dateOfPublishing: now,
    publishedOn: now,
    isOnCentralDisk: true,
    archiveStatusMessage: "datasetCreated",
    retrieveStatusMessage: "",
    retrieveIntegrityCheck: false,
  };
}

// Deterministic pseudo-random in [0,1) from a string seed
function rand(seed) {
  return parseInt(createHash("md5").update(seed).digest("hex").slice(0, 8), 16) / 0x100000000;
}

function buildProposal(p, instrumentId) {
  const start = new Date(p.start);
  const end = new Date(start.getTime() + p.days * 24 * HOUR);
  const now = new Date();
  return {
    _id: p.proposalId,
    createdBy: CREATED_BY,
    updatedBy: CREATED_BY,
    ownerGroup: p.proposalId,
    accessGroups: [p.instrument.toLowerCase()],
    isPublished: false,
    proposalId: p.proposalId,
    pi_firstname: p.pi[0],
    pi_lastname: p.pi[1],
    pi_email: p.pi[2],
    firstname: p.contact[0],
    lastname: p.contact[1],
    email: p.contact[2],
    title: p.title,
    abstract: p.abstract,
    startTime: start,
    endTime: end,
    MeasurementPeriodList: [],
    metadata: {},
    parentProposalId: null,
    type: "Default Proposal",
    instrumentIds: [instrumentId],
    numberOfDatasets: p.runs.length + p.derived.length,
    keywords: p.keywords,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  };
}

function buildDatasets(p, instrumentId) {
  const instr = INSTRUMENTS[p.instrument];
  const lower = p.instrument.toLowerCase();
  const year = new Date(p.start).getUTCFullYear();
  const base = `/ess/data/${lower}/${year}/${p.proposalId}`;
  const runBase = 1000 + Math.floor(rand(p.proposalId) * 8000);
  const start = new Date(p.start).getTime();
  const span = p.days * 24 * HOUR;
  const now = new Date();

  const common = (extra) => ({
    createdBy: CREATED_BY,
    updatedBy: CREATED_BY,
    ownerGroup: p.proposalId,
    accessGroups: [lower],
    isPublished: false,
    owner: `${p.contact[0]} ${p.contact[1]}`,
    ownerEmail: p.contact[2],
    contactEmail: p.contact[2],
    packedSize: 0,
    numberOfFilesArchived: 0,
    version: "4",
    datasetlifecycle: lifecycle(),
    sharedWith: [],
    principalInvestigators: [`${p.pi[0]} ${p.pi[1]}`],
    creationLocation: `/ESS/${p.instrument}`,
    proposalIds: [p.proposalId],
    sampleIds: [],
    instrumentIds: [instrumentId],
    techniques: [],
    relationships: [],
    classification: "IN=medium,AV=low,CO=low",
    createdAt: now,
    updatedAt: now,
    __v: 0,
    ...extra,
  });

  const raws = p.runs.map((run, i) => {
    const runNumber = String(runBase + i * 3);
    const pid = `${PID_PREFIX}/${stableUuid(`${p.proposalId}-raw-${i}`)}`;
    const runStart = new Date(start + (span * (i + 0.3)) / (p.runs.length + 1));
    const durationH = 1 + rand(pid) * 6;
    const runEnd = new Date(runStart.getTime() + durationH * HOUR);
    const file = `${lower}_${runNumber}.nxs`;
    const [minSize, maxSize] = instr.rawSize;
    const size = Math.round(minSize + rand(pid + "s") * (maxSize - minSize));

    const meta = toMetadata({
      facility: ["ESS", "", "Facility"],
      instrument: [p.instrument, "", "Instrument"],
      proposal_id: [p.proposalId, "", "Proposal ID"],
      run_number: [Number(runNumber), "", "Run Number"],
      run_name: [slug(`${run.label} run ${runNumber}`), "", "Run Name"],
      sample_description: [p.sample, "", "Sample Description"],
      start_time: [runStart.toISOString(), "", "Start Time"],
      end_time: [runEnd.toISOString(), "", "End Time"],
      source_power: [+(1.8 + rand(pid + "p") * 0.4).toFixed(2), "MW", "Source Power"],
      dataset_path: [`${base}/raw/${file}`, "", "Dataset Path"],
      ...instr.meta,
      ...run.meta,
    });

    return common({
      _id: pid,
      pid,
      type: "raw",
      datasetName: `${run.label} (run ${runNumber})`,
      description: `${run.label}. ${p.sample}. Measured on ${p.instrument} for proposal ${p.proposalId}.`,
      keywords: [p.instrument, "raw", ...p.keywords.slice(0, 2)],
      sourceFolder: `${base}/raw`,
      size,
      numberOfFiles: 1 + Math.floor(rand(pid + "f") * 40),
      creationTime: runEnd,
      scientificMetadata: meta,
      dataFormat: instr.format,
      runNumber,
      inputDatasets: [],
      usedSoftware: [],
    });
  });

  const derived = p.derived.map((d, j) => {
    const pid = `${PID_PREFIX}/${stableUuid(`${p.proposalId}-derived-${j}`)}`;
    const inputs = d.inputs.map((i) => raws[i]);
    const lastInput = Math.max(...inputs.map((r) => r.creationTime.getTime()));
    const created = new Date(lastInput + (6 + j * 20) * HOUR);
    const software = instr.software.slice(0, j === 0 ? 1 : instr.software.length);
    const runNumbers = inputs.map((r) => r.runNumber).join(", ");
    const file = `${slug(d.name)}.h5`;

    const meta = toMetadata({
      facility: ["ESS", "", "Facility"],
      instrument: [p.instrument, "", "Instrument"],
      proposal_id: [p.proposalId, "", "Proposal ID"],
      input_runs: [runNumbers, "", "Input Runs"],
      processing_software: [software.join(", "), "", "Processing Software"],
      processing_stage: [j === 0 ? "reduction" : "analysis", "", "Processing Stage"],
      dataset_path: [`${base}/processed/${file}`, "", "Dataset Path"],
      ...d.meta,
    });

    return common({
      _id: pid,
      pid,
      type: "derived",
      datasetName: `${d.name} – ${p.proposalId}`,
      description: `${d.name} from runs ${runNumbers}, produced with ${software.join(", ")}.`,
      keywords: [p.instrument, j === 0 ? "reduced" : "analysed", ...p.keywords.slice(0, 2)],
      sourceFolder: `${base}/processed`,
      size: Math.round(5e6 + rand(pid) * 900e6),
      numberOfFiles: 1 + Math.floor(rand(pid + "f") * 6),
      creationTime: created,
      scientificMetadata: meta,
      dataFormat: "HDF5",
      runNumber: inputs[inputs.length - 1].runNumber,
      inputDatasets: inputs.map((r) => r.pid),
      usedSoftware: software,
      investigator: `${p.contact[0]} ${p.contact[1]}`,
    });
  });

  return [...raws, ...derived];
}

// Mirrors MetadataKeysService.insertManyFromSource for sourceType "Dataset"
function metadataKeyOps(dataset) {
  const userGroups = Array.from(new Set([dataset.ownerGroup, ...dataset.accessGroups]));
  return Object.entries(dataset.scientificMetadata).map(([key, e]) => ({
    updateOne: {
      filter: {
        sourceType: "Dataset",
        key: decodeURIComponent(key),
        humanReadableName: e.human_name ?? "",
      },
      update: {
        $set: { updatedAt: new Date() },
        $inc: {
          usageCount: 1,
          ...Object.fromEntries(userGroups.map((g) => [`userGroupCounts.${g}`, 1])),
        },
        $max: { isPublished: dataset.isPublished },
        $addToSet: { userGroups: { $each: userGroups } },
        $setOnInsert: {
          id: randomUUID(),
          createdBy: "system",
          updatedBy: "system",
          createdAt: new Date(),
          __v: 0,
        },
      },
      upsert: true,
    },
  }));
}

async function ensureInstrument(db, name) {
  const col = db.collection("Instrument");
  const existing = await col.findOne({ uniqueName: name });
  if (existing) return existing._id;
  const pid = `${PID_PREFIX}${randomUUID()}`;
  const now = new Date();
  await col.insertOne({
    _id: pid,
    pid,
    uniqueName: name,
    name,
    customMetadata: {},
    createdBy: CREATED_BY,
    updatedBy: CREATED_BY,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  });
  console.log(`Created instrument ${name} (${pid})`);
  return pid;
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log(`Seeding ${db.databaseName}`);

  const instrumentIds = {};
  for (const name of Object.keys(INSTRUMENTS)) {
    instrumentIds[name] = await ensureInstrument(db, name);
  }

  let proposals = 0;
  let datasets = 0;
  for (const p of PROPOSALS) {
    if (await db.collection("Proposal").findOne({ _id: p.proposalId })) {
      console.log(`Skipping ${p.proposalId}: already exists`);
      continue;
    }
    const instrumentId = instrumentIds[p.instrument];
    const ds = buildDatasets(p, instrumentId);

    await db.collection("Proposal").insertOne(buildProposal(p, instrumentId));
    await db.collection("Dataset").insertMany(ds);
    await db.collection("MetadataKeys").bulkWrite(ds.flatMap(metadataKeyOps));

    proposals++;
    datasets += ds.length;
    console.log(`${p.instrument.padEnd(8)} ${p.proposalId}  ${p.title}`);
  }

  console.log(`\nInserted ${proposals} proposals and ${datasets} datasets.`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
