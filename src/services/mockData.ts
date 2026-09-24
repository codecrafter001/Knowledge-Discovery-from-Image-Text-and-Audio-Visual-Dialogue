import type {
  IngestedDocument,
  Entity,
  Relation,
  Triplet,
  GraphData,
  PipelineStage,
  PipelineLog,
  EvidenceItem,
  EvaluationMetricCard,
  ModalityBenchmark,
  AppSettings,
  SearchQueryResponse
} from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  useMockBackend: true,
  activeDataset: 'NASA-DeepSpace-Multimodal-v3',
  llmModel: 'gemini-2.0-flash-exp',
  vlmModel: 'qwen2.5-vl-72b',
  asrModel: 'whisper-large-v3-turbo',
  similarityThreshold: 0.82,
  autoLinkThreshold: 0.78,
  enableCrossModalReasoning: true,
  enableCommunityDetection: true,
  theme: 'obsidian',
};

export const MOCK_DOCUMENTS: IngestedDocument[] = [
  {
    id: 'doc-1',
    title: 'NASA Perseverance: Mastcam-Z Jezero Crater Mineralogy',
    filename: 'mars_perseverance_delta_mastcam.jpg',
    modality: 'image',
    fileSize: '4.8 MB',
    uploadedAt: '2026-09-08 10:14:22',
    status: 'completed',
    progress: 100,
    domain: 'Planetary Science & Robotics',
    summary: 'High-resolution multispectral image of the western Jezero Crater fan deposit highlighting clay phyllosilicates and rover sample drilling target.',
    confidenceScore: 0.96,
    entityCount: 8,
    relationCount: 12,
    tripletCount: 9,
    thumbnailUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
    contentUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&q=80',
    boundingBoxes: [
      { id: 'bb-1', label: 'Robotic Arm Turret', confidence: 0.98, color: '#00f2fe', x: 22, y: 38, width: 28, height: 35, entityId: 'ent-1' },
      { id: 'bb-2', label: 'Jezero Delta Layer', confidence: 0.94, color: '#f59e0b', x: 55, y: 15, width: 38, height: 42, entityId: 'ent-2' },
      { id: 'bb-3', label: 'SuperCam Instrument', confidence: 0.92, color: '#10b981', x: 12, y: 18, width: 16, height: 22, entityId: 'ent-3' },
      { id: 'bb-4', label: 'Regolith Carbonate Deposit', confidence: 0.89, color: '#e100ff', x: 68, y: 64, width: 24, height: 28, entityId: 'ent-4' },
    ],
    metadata: {
      resolution: '4096 x 3072',
      visionModel: 'YOLOv11-Geo + SegmentAnything-2',
      embeddingModel: 'EVA-02-CLIP-E/14-plus'
    }
  },
  {
    id: 'doc-2',
    title: 'Quantum Decoherence in Transmon Qubits Dialogue',
    filename: 'quantum_symposium_panel_audio.wav',
    modality: 'audio',
    fileSize: '18.4 MB',
    uploadedAt: '2026-09-08 11:32:05',
    status: 'completed',
    progress: 100,
    domain: 'Quantum Computing',
    summary: 'Audio transcript of panel discussion analyzing superconducting transmon noise mitigation, cryogenic dilution refrigeration, and T1 coherence times.',
    confidenceScore: 0.93,
    entityCount: 11,
    relationCount: 16,
    tripletCount: 14,
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
    audioDuration: 245,
    dialogueUtterances: [
      {
        id: 'utt-1',
        speaker: 'Dr. Elena Vance (Lead Physicist)',
        startTime: 4.5,
        endTime: 18.2,
        text: 'When we drop the dilution refrigerator below 15 millikelvin, we observe a 40% enhancement in the T1 relaxation times for our transmon qubit architecture.',
        confidence: 0.98,
        sentiment: 'positive',
        extractedEntities: ['Transmon Qubit', 'Dilution Refrigerator', 'T1 Coherence Time']
      },
      {
        id: 'utt-2',
        speaker: 'Dr. Marcus Reed (Quantum Engineer)',
        startTime: 19.0,
        endTime: 34.8,
        text: 'However, dielectric loss in the amorphous aluminum oxide junction remains the dominating bottleneck causing premature quantum state decoherence.',
        confidence: 0.95,
        sentiment: 'critical',
        extractedEntities: ['Quantum Decoherence', 'Aluminum Oxide Junction', 'Dielectric Loss']
      },
      {
        id: 'utt-3',
        speaker: 'Dr. Elena Vance (Lead Physicist)',
        startTime: 35.5,
        endTime: 52.1,
        text: 'Agreed. That is why replacing the standard junction with epitaxial tantalum resonators has achieved over 300 microseconds of phase fidelity.',
        confidence: 0.96,
        sentiment: 'inquisitive',
        extractedEntities: ['Tantalum Resonator', 'Phase Fidelity']
      }
    ],
    metadata: {
      sampleRate: '48.0 kHz 24-bit Stereo',
      asrEngine: 'Whisper-Large-v3-Turbo + PyAnnote Diarization',
      embeddingModel: 'WavLM-Large-Semantic'
    }
  },
  {
    id: 'doc-3',
    title: 'Cross-Modal Knowledge Discovery in Clinical Oncology',
    filename: 'clinical_multimodal_pathology_paper.pdf',
    modality: 'text',
    fileSize: '3.2 MB',
    uploadedAt: '2026-09-08 12:45:10',
    status: 'completed',
    progress: 100,
    domain: 'Bio-Medical & Oncology',
    summary: 'Clinical research paper proposing unified attention fusion between whole-slide histopathology images, genomics sequence vectors, and oncological patient consultation notes.',
    confidenceScore: 0.95,
    entityCount: 14,
    relationCount: 22,
    tripletCount: 18,
    thumbnailUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
    textContent: `Abstract: Clinical oncology decisions require synthesizing disparate modalities including histopathology gigapixel scans, whole-genome sequencing (WGS) profiles, and unstructured doctor-patient dialogues. We formulate a Cross-Modal Triplet Transformer (CM-TT) that grounds visual cell morphology with somatic gene mutation markers (such as KRAS G12D and TP53 inactivation). By performing joint contrastive graph learning, our pipeline extracts actionable therapeutic triplets with 94.8% precision, identifying targeted immunotherapies like Pembrolizumab responsiveness.`,
    metadata: {
      pageCount: 16,
      tokenCount: 8420,
      embeddingModel: 'BGE-M3 Multilingual Dense/Sparse'
    }
  },
  {
    id: 'doc-4',
    title: 'Autonomous Vehicle AV-Dialogue & Urban Scene Perception',
    filename: 'av_teleoperation_urban_dialogue.mp4',
    modality: 'video',
    fileSize: '42.1 MB',
    uploadedAt: '2026-09-08 14:10:00',
    status: 'completed',
    progress: 100,
    domain: 'Robotics & Autonomous Systems',
    summary: 'Audio-visual recording of autonomous vehicle tele-operator dialogue coordinated with LiDAR bounding boxes and front-camera object segmentation in dense urban intersections.',
    confidenceScore: 0.91,
    entityCount: 12,
    relationCount: 18,
    tripletCount: 15,
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    contentUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    videoDuration: 310,
    boundingBoxes: [
      { id: 'bb-av-1', label: 'Pedestrian with Stroller', confidence: 0.97, color: '#e100ff', x: 42, y: 52, width: 14, height: 32, entityId: 'ent-av-1' },
      { id: 'bb-av-2', label: 'Occluded Delivery Van', confidence: 0.91, color: '#f59e0b', x: 62, y: 38, width: 26, height: 36, entityId: 'ent-av-2' },
      { id: 'bb-av-3', label: 'Emergency Vehicle Signal', confidence: 0.96, color: '#00f2fe', x: 18, y: 22, width: 12, height: 18, entityId: 'ent-av-3' },
    ],
    dialogueUtterances: [
      {
        id: 'utt-av-1',
        speaker: 'Tele-Operator (Station 4)',
        startTime: 12.0,
        endTime: 21.4,
        text: 'Vehicle 102, initiate dynamic yield at 4th and Market. Pedestrian with stroller is entering crosswalk from behind the delivery van.',
        confidence: 0.97,
        sentiment: 'inquisitive',
        extractedEntities: ['Pedestrian with Stroller', 'Delivery Van', 'Crosswalk Yield']
      },
      {
        id: 'utt-av-2',
        speaker: 'AV Perception System (AI Co-pilot)',
        startTime: 22.0,
        endTime: 28.5,
        text: 'Yield trajectory confirmed. Decelerating to 0 km/h with 4.2 meter safety margin. Emergency vehicle beacon detected on peripheral sensor.',
        confidence: 0.99,
        sentiment: 'positive',
        extractedEntities: ['Trajectory Planner', 'Emergency Vehicle Signal']
      }
    ],
    metadata: {
      resolution: '1920 x 1080 @ 60fps',
      asrEngine: 'Whisper-Large-v3',
      visionModel: 'DINOv2-Giant + BEVFormer',
      embeddingModel: 'ImageBind-Multimodal'
    }
  },
  {
    id: 'doc-5',
    title: 'Earth Observation: Wildfire Thermal Infrared Analysis',
    filename: 'satellite_sentinel_wildfire_ir.tiff',
    modality: 'image',
    fileSize: '9.2 MB',
    uploadedAt: '2026-09-08 15:20:44',
    status: 'completed',
    progress: 100,
    domain: 'Geospatial & Climate Intelligence',
    summary: 'Multispectral satellite image capturing wildfire thermal hotspots, smoke plume dispersion vectors, and proximity to critical power grid infrastructure.',
    confidenceScore: 0.94,
    entityCount: 9,
    relationCount: 13,
    tripletCount: 11,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    contentUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    boundingBoxes: [
      { id: 'bb-sat-1', label: 'Active Thermal Hotspot', confidence: 0.98, color: '#ef4444', x: 45, y: 35, width: 22, height: 26, entityId: 'ent-sat-1' },
      { id: 'bb-sat-2', label: 'Smoke Plume Vector', confidence: 0.92, color: '#94a3b8', x: 20, y: 15, width: 35, height: 40, entityId: 'ent-sat-2' },
      { id: 'bb-sat-3', label: 'Transmission Substation', confidence: 0.88, color: '#00f2fe', x: 72, y: 60, width: 18, height: 20, entityId: 'ent-sat-3' },
    ],
    metadata: {
      resolution: '3840 x 2160 Band 12 SWIR',
      visionModel: 'Prithvi-100M-Geospatial',
      embeddingModel: 'Clay-Foundation-v1'
    }
  }
];

export const MOCK_ENTITIES: Entity[] = [
  {
    id: 'ent-1',
    name: 'Perseverance Robotic Turret',
    category: 'Technology',
    description: 'Robotic sampling arm instrument suite equipped with drill, PIXL X-ray spectrometer, and SHERLOC deep UV Raman.',
    modalityOrigins: ['image', 'text'],
    frequency: 18,
    confidence: 0.98,
    sourceDocIds: ['doc-1', 'doc-3'],
    aliases: ['Perseverance Arm', 'Robotic Turret', 'Sampling Drill'],
    attributes: { Mass: '45 kg', DegreesOfFreedom: 5, MaxReach: '2.1 m' },
    color: '#00f2fe'
  },
  {
    id: 'ent-2',
    name: 'Jezero Delta Phyllosilicates',
    category: 'Visual Object',
    description: 'Ancient river delta clay mineral formations on Mars holding potential biosignature preservation.',
    modalityOrigins: ['image'],
    frequency: 14,
    confidence: 0.95,
    sourceDocIds: ['doc-1'],
    aliases: ['Jezero Delta', 'Phyllosilicate Beds', 'Ancient River Fan'],
    attributes: { Age: '3.7 Billion Years', MineralClass: 'Smectite/Illite' },
    color: '#f59e0b'
  },
  {
    id: 'ent-3',
    name: 'SuperCam Laser Spectrometer',
    category: 'Technology',
    description: 'Remote optical sensing suite using Laser-Induced Breakdown Spectroscopy (LIBS) to vaporize rock targets.',
    modalityOrigins: ['image', 'text'],
    frequency: 12,
    confidence: 0.93,
    sourceDocIds: ['doc-1'],
    aliases: ['SuperCam', 'LIBS Instrument', 'Mars Laser Remote Sensor'],
    attributes: { LaserWavelength: '1064 nm', StandOffRange: '7 meters' },
    color: '#10b981'
  },
  {
    id: 'ent-transmon',
    name: 'Transmon Qubit',
    category: 'Technology',
    description: 'Superconducting charge qubit engineered with a large shunting capacitor to suppress charge dispersion noise.',
    modalityOrigins: ['audio', 'text'],
    frequency: 24,
    confidence: 0.97,
    sourceDocIds: ['doc-2', 'doc-3'],
    aliases: ['Transmon', 'Superconducting Qubit', 'Non-linear Resonator'],
    attributes: { CoherenceT1: '320 us', OperatingTemp: '12 mK', QFactor: '1.8M' },
    color: '#7f00ff'
  },
  {
    id: 'ent-decoherence',
    name: 'Quantum Decoherence',
    category: 'Concept',
    description: 'Loss of quantum coherence leading to state transition from quantum superposition into classical statistical mixture.',
    modalityOrigins: ['audio', 'text'],
    frequency: 29,
    confidence: 0.96,
    sourceDocIds: ['doc-2'],
    aliases: ['State Decoherence', 'Phase Relaxation', 'Quantum Noise'],
    attributes: { DominantCause: 'Two-Level System (TLS) Defects', LossTangent: '1.2e-5' },
    color: '#ec4899'
  },
  {
    id: 'ent-elena',
    name: 'Dr. Elena Vance',
    category: 'Person',
    description: 'Principal Investigator and Lead Quantum Physicist directing superconducting circuit coherence and fabrication.',
    modalityOrigins: ['audio'],
    frequency: 15,
    confidence: 0.99,
    sourceDocIds: ['doc-2'],
    aliases: ['Elena Vance', 'Dr. Vance', 'PI Vance'],
    attributes: { Affiliation: 'Quantum Nano-Fabrication Institute', HIndex: 42 },
    color: '#38bdf8'
  },
  {
    id: 'ent-kras',
    name: 'KRAS G12D Mutation',
    category: 'Concept',
    description: 'Oncogenic somatic point mutation triggering constitutive GTPase activation in pancreatic and colorectal carcinomas.',
    modalityOrigins: ['text'],
    frequency: 22,
    confidence: 0.97,
    sourceDocIds: ['doc-3'],
    aliases: ['KRAS G12D', 'G12D Oncogene', 'KRAS Mutation'],
    attributes: { Pathway: 'MAPK/ERK Signaling', TargetableBy: 'MRTX1133' },
    color: '#ef4444'
  },
  {
    id: 'ent-pembrolizumab',
    name: 'Pembrolizumab Immunotherapy',
    category: 'Technology',
    description: 'Humanized monoclonal anti-PD-1 antibody that releases T-cell mediated antitumor immune responses.',
    modalityOrigins: ['text'],
    frequency: 16,
    confidence: 0.94,
    sourceDocIds: ['doc-3'],
    aliases: ['Keytruda', 'Anti-PD-1', 'Pembrolizumab'],
    attributes: { DrugClass: 'Checkpoint Inhibitor', FDAApproval: '2014' },
    color: '#10b981'
  },
  {
    id: 'ent-av-trajectory',
    name: 'Dynamic Urban Trajectory Planner',
    category: 'Technology',
    description: 'Real-time optimization engine calculating collision-free vehicle trajectories across multi-agent urban crosswalks.',
    modalityOrigins: ['video', 'audio'],
    frequency: 20,
    confidence: 0.96,
    sourceDocIds: ['doc-4'],
    aliases: ['Trajectory Optimizer', 'AV Path Planner', 'Yield Controller'],
    attributes: { Latency: '18 ms', ReplanningFrequency: '50 Hz' },
    color: '#00f2fe'
  },
  {
    id: 'ent-pedestrian',
    name: 'Crosswalk Pedestrian with Stroller',
    category: 'Visual Object',
    description: 'Vulnerable road user entity detected via combined LiDAR 3D point cloud and camera bounding box tracking.',
    modalityOrigins: ['video', 'audio'],
    frequency: 11,
    confidence: 0.95,
    sourceDocIds: ['doc-4'],
    aliases: ['Pedestrian', 'Crosswalk Agent', 'Vulnerable Road User'],
    attributes: { Velocity: '1.2 m/s', Heading: 'South-East', Distance: '8.4 m' },
    color: '#e100ff'
  },
  {
    id: 'ent-wildfire',
    name: 'Wildfire Thermal Hotspot',
    category: 'Visual Object',
    description: 'High-intensity radiative power anomaly detected via SWIR satellite sensors indicating active front fire spread.',
    modalityOrigins: ['image'],
    frequency: 19,
    confidence: 0.98,
    sourceDocIds: ['doc-5'],
    aliases: ['Active Fire Core', 'Thermal Hotspot', 'SWIR Anomaly'],
    attributes: { FireRadiativePower: '840 MW', SpreadVelocity: '4.5 km/h' },
    color: '#f97316'
  },
  {
    id: 'ent-substation',
    name: 'Regional Power Substation',
    category: 'Location',
    description: 'Critical electrical distribution transmission node situated in proximity to forest fire propagation vector.',
    modalityOrigins: ['image'],
    frequency: 8,
    confidence: 0.91,
    sourceDocIds: ['doc-5'],
    aliases: ['High Voltage Substation', 'Grid Node 14-B'],
    attributes: { VoltageCapacity: '230 kV', ThreatLevel: 'Critical Tier 1' },
    color: '#a855f7'
  }
];

export const MOCK_RELATIONS: Relation[] = [
  { id: 'rel-1', name: 'analyzes_geology_of', category: 'Semantic', description: 'Instrument conducts physical/chemical spectroscopic sampling of planetary terrain.', count: 8 },
  { id: 'rel-2', name: 'causes_quantum_error_in', category: 'Causal', description: 'Environmental or material physical phenomenon degrading quantum coherence state.', count: 14 },
  { id: 'rel-3', name: 'hypothesized_by_speaker', category: 'Audio-Conversational', description: 'Proposition or scientific discovery articulated by an audio dialogue participant.', count: 18 },
  { id: 'rel-4', name: 'visually_spatially_adjacent_to', category: 'Visual-Spatial', description: 'Entities co-occurring in proximate spatial pixel/voxel coordinates.', count: 22 },
  { id: 'rel-5', name: 'therapeutically_inhibits', category: 'Causal', description: 'Pharmacological compound or antibody suppressing oncogenic pathway activity.', count: 12 },
  { id: 'rel-6', name: 'regulates_motion_trajectory_of', category: 'Structural', description: 'Real-time perception control loop altering autonomous vehicle kinematic states.', count: 16 },
  { id: 'rel-7', name: 'threatens_infrastructure_asset', category: 'Temporal', description: 'Environmental hazard advancing towards fixed municipal or industrial grid asset.', count: 9 },
];

export const MOCK_TRIPLETS: Triplet[] = [
  {
    id: 'trip-1',
    subjectId: 'ent-1',
    subjectName: 'Perseverance Robotic Turret',
    subjectCategory: 'Technology',
    predicate: 'analyzes_geology_of',
    objectId: 'ent-2',
    objectName: 'Jezero Delta Phyllosilicates',
    objectCategory: 'Visual Object',
    modality: 'image',
    confidence: 0.96,
    sourceDocId: 'doc-1',
    sourceDocTitle: 'NASA Perseverance: Mastcam-Z Jezero Crater Mineralogy',
    evidenceSnippet: 'Robotic Arm Turret (bbox: [22%, 38%]) positioned to extract core drill sample from clay phyllosilicate layered beds.',
    boundingBox: { id: 'bb-1', label: 'Robotic Arm Turret', confidence: 0.98, color: '#00f2fe', x: 22, y: 38, width: 28, height: 35 },
    verified: true
  },
  {
    id: 'trip-2',
    subjectId: 'ent-3',
    subjectName: 'SuperCam Laser Spectrometer',
    subjectCategory: 'Technology',
    predicate: 'visually_spatially_adjacent_to',
    objectId: 'ent-1',
    objectName: 'Perseverance Robotic Turret',
    objectCategory: 'Technology',
    modality: 'image',
    confidence: 0.94,
    sourceDocId: 'doc-1',
    sourceDocTitle: 'NASA Perseverance: Mastcam-Z Jezero Crater Mineralogy',
    evidenceSnippet: 'SuperCam mast assembly operates in spatial conjunction with the turret for standoff spectroscopy calibration.',
    verified: true
  },
  {
    id: 'trip-3',
    subjectId: 'ent-elena',
    subjectName: 'Dr. Elena Vance',
    subjectCategory: 'Person',
    predicate: 'hypothesized_by_speaker',
    objectId: 'ent-transmon',
    objectName: 'Transmon Qubit',
    objectCategory: 'Technology',
    modality: 'audio',
    confidence: 0.98,
    sourceDocId: 'doc-2',
    sourceDocTitle: 'Quantum Decoherence in Transmon Qubits Dialogue',
    evidenceSnippet: '[00:04 - 00:18] Dr. Elena Vance: "When we drop the dilution refrigerator below 15 mK, we observe a 40% enhancement in T1 relaxation times for our transmon qubit architecture."',
    timestampRange: [4.5, 18.2],
    verified: true
  },
  {
    id: 'trip-4',
    subjectId: 'ent-decoherence',
    subjectName: 'Quantum Decoherence',
    subjectCategory: 'Concept',
    predicate: 'causes_quantum_error_in',
    objectId: 'ent-transmon',
    objectName: 'Transmon Qubit',
    objectCategory: 'Technology',
    modality: 'audio',
    confidence: 0.95,
    sourceDocId: 'doc-2',
    sourceDocTitle: 'Quantum Decoherence in Transmon Qubits Dialogue',
    evidenceSnippet: '[00:19 - 00:34] Dr. Marcus Reed: "dielectric loss in the amorphous aluminum oxide junction remains the dominating bottleneck causing premature quantum state decoherence."',
    timestampRange: [19.0, 34.8],
    verified: true
  },
  {
    id: 'trip-5',
    subjectId: 'ent-pembrolizumab',
    subjectName: 'Pembrolizumab Immunotherapy',
    subjectCategory: 'Technology',
    predicate: 'therapeutically_inhibits',
    objectId: 'ent-kras',
    objectName: 'KRAS G12D Mutation',
    objectCategory: 'Concept',
    modality: 'text',
    confidence: 0.93,
    sourceDocId: 'doc-3',
    sourceDocTitle: 'Cross-Modal Knowledge Discovery in Clinical Oncology',
    evidenceSnippet: 'Page 3: "...identifying targeted immunotherapies like Pembrolizumab responsiveness in KRAS-mutant tumor microenvironments with high somatic neoantigen burden."',
    pageNumber: 3,
    verified: true
  },
  {
    id: 'trip-6',
    subjectId: 'ent-av-trajectory',
    subjectName: 'Dynamic Urban Trajectory Planner',
    subjectCategory: 'Technology',
    predicate: 'regulates_motion_trajectory_of',
    objectId: 'ent-pedestrian',
    objectName: 'Crosswalk Pedestrian with Stroller',
    objectCategory: 'Visual Object',
    modality: 'video',
    confidence: 0.97,
    sourceDocId: 'doc-4',
    sourceDocTitle: 'Autonomous Vehicle AV-Dialogue & Urban Scene Perception',
    evidenceSnippet: '[00:22 - 00:28] AV Co-pilot: "Yield trajectory confirmed. Decelerating to 0 km/h with 4.2 meter safety margin to crosswalk pedestrian."',
    timestampRange: [22.0, 28.5],
    verified: true
  },
  {
    id: 'trip-7',
    subjectId: 'ent-wildfire',
    subjectName: 'Wildfire Thermal Hotspot',
    subjectCategory: 'Visual Object',
    predicate: 'threatens_infrastructure_asset',
    objectId: 'ent-substation',
    objectName: 'Regional Power Substation',
    objectCategory: 'Location',
    modality: 'image',
    confidence: 0.92,
    sourceDocId: 'doc-5',
    sourceDocTitle: 'Earth Observation: Wildfire Thermal Infrared Analysis',
    evidenceSnippet: 'Thermal infrared band reveals 840 MW radiative wavefront expanding within 1.8 kilometers of Regional Power Substation 14-B.',
    verified: true
  },
  {
    id: 'trip-8',
    subjectId: 'ent-elena',
    subjectName: 'Dr. Elena Vance',
    subjectCategory: 'Person',
    predicate: 'analyzes_geology_of',
    objectId: 'ent-decoherence',
    objectName: 'Quantum Decoherence',
    objectCategory: 'Concept',
    modality: 'audio',
    confidence: 0.94,
    sourceDocId: 'doc-2',
    sourceDocTitle: 'Quantum Decoherence in Transmon Qubits Dialogue',
    evidenceSnippet: 'Keynote analysis connecting materials fabrication defects directly to phase decoherence relaxation.',
    timestampRange: [35.5, 52.1],
    verified: true
  }
];

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: MOCK_ENTITIES.map(ent => ({
    id: ent.id,
    name: ent.name,
    category: ent.category,
    modality: ent.modalityOrigins[0],
    val: Math.max(12, ent.frequency * 1.5),
    color: ent.color || '#00f2fe',
    entity: ent
  })),
  links: MOCK_TRIPLETS.map(trip => ({
    id: trip.id,
    source: trip.subjectId,
    target: trip.objectId,
    predicate: trip.predicate,
    confidence: trip.confidence,
    modality: trip.modality,
    tripletId: trip.id,
    color: trip.modality === 'image' ? '#f59e0b' : trip.modality === 'audio' ? '#7f00ff' : trip.modality === 'video' ? '#00f2fe' : '#10b981'
  }))
};

export const MOCK_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'Multimodal Ingestion & Normalization',
    description: 'Asynchronous streaming & frame decoding for 4K video, 48kHz audio spectrograms, and OCR text tokenization.',
    modality: 'multimodal',
    status: 'completed',
    latencyMs: 142,
    throughput: '380 docs/min',
    modelEngine: 'FFmpeg + PyMuPDF + Librosa',
    metrics: { 'FPS Decoded': '120 fps', 'Audio Chunking': '30s sliding', 'OCR Character Accuracy': '99.4%' }
  },
  {
    id: 'stage-2',
    order: 2,
    name: 'Perceptual & Acoustic Feature Extraction',
    description: 'Vision-language patch encoding and acoustic wav2vec/whisper speech encoder token embeddings.',
    modality: 'multimodal',
    status: 'completed',
    latencyMs: 285,
    throughput: '240 items/sec',
    modelEngine: 'CLIP-EVA02-Large + Whisper-Turbo',
    metrics: { 'Embedding Dim': '1536 dense', 'Speaker Diarization DER': '3.2%', 'Visual Token Count': '576 per frame' }
  },
  {
    id: 'stage-3',
    order: 3,
    name: 'Cross-Modal Coreference & Alignment',
    description: 'Aligns speech utterance speaker turns with visual bounding boxes and document textual mentions.',
    modality: 'multimodal',
    status: 'completed',
    latencyMs: 310,
    throughput: '185 aligns/sec',
    modelEngine: 'Qwen2.5-VL-72B Grounding + Graph-RAG',
    metrics: { 'Cross-Modal Grounding Score': '94.8%', 'Dialogue Coref Accuracy': '96.2%' }
  },
  {
    id: 'stage-4',
    order: 4,
    name: 'Knowledge Triplet Synthesis & OpenIE',
    description: 'Extracts formal Subject-Predicate-Object triplets with evidentiary span attribution and provenance tagging.',
    modality: 'multimodal',
    status: 'completed',
    latencyMs: 420,
    throughput: '310 triplets/sec',
    modelEngine: 'Gemini-2.0-Flash Structured OpenIE',
    metrics: { 'Triplet Precision': '95.4%', 'Hallucination Mitigation': '98.1%' }
  },
  {
    id: 'stage-5',
    order: 5,
    name: 'Vector Indexing & Graph Verification',
    description: 'Upserts graph vertices/edges into Neo4j/Qdrant and validates logical consistency against schema ontologies.',
    modality: 'multimodal',
    status: 'completed',
    latencyMs: 98,
    throughput: '1.2k vectors/sec',
    modelEngine: 'Qdrant HNSW + Neo4j Cypher Engine',
    metrics: { 'Graph Node Count': '1,420', 'Edge Count': '3,890', 'Vector Latency': '4.2ms' }
  }
];

export const MOCK_PIPELINE_LOGS: PipelineLog[] = [
  { id: 'log-1', timestamp: '23:02:14.210', stageId: 'stage-1', stageName: 'Ingestion', level: 'info', message: 'Received multimodal batch ingestion job [batch-id: 8841-alpha].' },
  { id: 'log-2', timestamp: '23:02:14.450', stageId: 'stage-1', stageName: 'Ingestion', level: 'success', message: 'Extracted 4 high-res image crops and decoded 245s audio stream.' },
  { id: 'log-3', timestamp: '23:02:14.780', stageId: 'stage-2', stageName: 'Feature Extraction', level: 'info', message: 'Generating 1536-dim multimodal embeddings via EVA-02 CLIP & Whisper-Turbo.' },
  { id: 'log-4', timestamp: '23:02:15.110', stageId: 'stage-3', stageName: 'Cross-Modal Alignment', level: 'info', message: 'Aligning audio speaker "Dr. Elena Vance" with visual transmon resonator diagram.' },
  { id: 'log-5', timestamp: '23:02:15.340', stageId: 'stage-3', stageName: 'Cross-Modal Alignment', level: 'success', message: 'Cross-modal grounding confidence reached 0.982 (IoU overlap > 0.85).' },
  { id: 'log-6', timestamp: '23:02:15.820', stageId: 'stage-4', stageName: 'Triplet Synthesis', level: 'info', message: 'Discovered 14 verified triplets across image, text, and dialogue channels.' },
  { id: 'log-7', timestamp: '23:02:16.010', stageId: 'stage-5', stageName: 'Vector Indexing', level: 'success', message: 'Successfully committed 14 verified edges to Knowledge Graph cluster.' }
];

export const MOCK_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev-1',
    tripletId: 'trip-1',
    tripletText: 'Perseverance Robotic Turret ──[analyzes_geology_of]──▶ Jezero Delta Phyllosilicates',
    docId: 'doc-1',
    docTitle: 'NASA Perseverance: Mastcam-Z Jezero Crater Mineralogy',
    modality: 'image',
    confidence: 0.96,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&q=80',
    boundingBox: { id: 'bb-1', label: 'Robotic Arm Turret', confidence: 0.98, color: '#00f2fe', x: 22, y: 38, width: 28, height: 35 },
    alignmentScore: 0.97,
    asrOcrConfidence: 0.99,
    crossModalConsistency: 0.96
  },
  {
    id: 'ev-2',
    tripletId: 'trip-3',
    tripletText: 'Dr. Elena Vance ──[hypothesized_by_speaker]──▶ Transmon Qubit',
    docId: 'doc-2',
    docTitle: 'Quantum Decoherence in Transmon Qubits Dialogue',
    modality: 'audio',
    confidence: 0.98,
    audioUrl: 'https://actions.google.com/sounds/v1/science/electronic_drone.ogg',
    dialogueUtterance: {
      id: 'utt-1',
      speaker: 'Dr. Elena Vance (Lead Physicist)',
      startTime: 4.5,
      endTime: 18.2,
      text: 'When we drop the dilution refrigerator below 15 millikelvin, we observe a 40% enhancement in the T1 relaxation times for our transmon qubit architecture.',
      confidence: 0.98,
      sentiment: 'positive'
    },
    alignmentScore: 0.98,
    asrOcrConfidence: 0.98,
    crossModalConsistency: 0.95
  },
  {
    id: 'ev-3',
    tripletId: 'trip-5',
    tripletText: 'Pembrolizumab Immunotherapy ──[therapeutically_inhibits]──▶ KRAS G12D Mutation',
    docId: 'doc-3',
    docTitle: 'Cross-Modal Knowledge Discovery in Clinical Oncology',
    modality: 'text',
    confidence: 0.93,
    textSnippet: 'By performing joint contrastive graph learning, our pipeline extracts actionable therapeutic triplets with 94.8% precision, identifying targeted immunotherapies like Pembrolizumab responsiveness in KRAS G12D mutated phenotypes.',
    pageNumber: 3,
    alignmentScore: 0.94,
    asrOcrConfidence: 0.99,
    crossModalConsistency: 0.92
  },
  {
    id: 'ev-4',
    tripletId: 'trip-6',
    tripletText: 'Dynamic Urban Trajectory Planner ──[regulates_motion_trajectory_of]──▶ Crosswalk Pedestrian',
    docId: 'doc-4',
    docTitle: 'Autonomous Vehicle AV-Dialogue & Urban Scene Perception',
    modality: 'video',
    confidence: 0.97,
    videoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    boundingBox: { id: 'bb-av-1', label: 'Pedestrian with Stroller', confidence: 0.97, color: '#e100ff', x: 42, y: 52, width: 14, height: 32 },
    dialogueUtterance: {
      id: 'utt-av-2',
      speaker: 'AV Perception System (AI Co-pilot)',
      startTime: 22.0,
      endTime: 28.5,
      text: 'Yield trajectory confirmed. Decelerating to 0 km/h with 4.2 meter safety margin. Crosswalk cleared.',
      confidence: 0.99
    },
    alignmentScore: 0.96,
    asrOcrConfidence: 0.97,
    crossModalConsistency: 0.98
  }
];

export const MOCK_EVALUATION_METRICS: EvaluationMetricCard[] = [
  { label: 'Triplet Extraction F1', value: '94.6%', change: '+3.8%', isPositive: true, benchmark: 'Baseline OpenIE 86.2%', modality: 'multimodal', description: 'Harmonic mean of precision and recall for cross-modal relational triplet extraction.' },
  { label: 'Cross-Modal Grounding', value: '93.2%', change: '+5.4%', isPositive: true, benchmark: 'Prior SOTA 88.0%', modality: 'image', description: 'Accuracy of mapping speech dialogue utterances to visual image bounding boxes.' },
  { label: 'Hallucination Mitigation', value: '98.2%', change: '+2.1%', isPositive: true, benchmark: 'Standard RAG 91.5%', modality: 'text', description: 'Evidentiary groundedness verified against primary source artifacts.' },
  { label: 'End-to-End Latency', value: '184 ms', change: '-32 ms', isPositive: true, benchmark: 'Target < 250 ms', modality: 'multimodal', description: 'Average response time for natural language cross-modal reasoning queries.' }
];

export const MOCK_MODALITY_BENCHMARKS: ModalityBenchmark[] = [
  { modality: 'Text (Clinical & Scientific)', precision: 0.962, recall: 0.941, f1: 0.951, alignmentScore: 0.958, hallucinationRate: 0.018, avgLatencyMs: 120 },
  { modality: 'Image (Planetary & Geospatial)', precision: 0.948, recall: 0.932, f1: 0.940, alignmentScore: 0.938, hallucinationRate: 0.024, avgLatencyMs: 185 },
  { modality: 'Audio (Panel Dialogue & Speech)', precision: 0.935, recall: 0.928, f1: 0.931, alignmentScore: 0.924, hallucinationRate: 0.029, avgLatencyMs: 210 },
  { modality: 'Video (AV Dialogue & Tele-ops)', precision: 0.924, recall: 0.910, f1: 0.917, alignmentScore: 0.912, hallucinationRate: 0.035, avgLatencyMs: 260 },
  { modality: 'Unified Cross-Modal Fusion', precision: 0.954, recall: 0.938, f1: 0.946, alignmentScore: 0.942, hallucinationRate: 0.021, avgLatencyMs: 184 },
];

export const MOCK_SEARCH_RESPONSES: Record<string, SearchQueryResponse> = {
  default: {
    query: 'How does cryogenic cooling impact quantum transmon coherence during dialogued experiments?',
    answer: 'According to the synthesized audio dialogue and clinical physics documentation, dropping the dilution refrigerator operating temperature below 15 millikelvin produces a 40% enhancement in the T1 relaxation times for superconducting transmon qubits. However, Dr. Marcus Reed emphasized that dielectric loss at the aluminum oxide junction remains a primary source of state decoherence, which Dr. Elena Vance resolves using epitaxial tantalum resonators (achieving >300 µs phase fidelity).',
    confidence: 0.97,
    retrievalMode: 'hybrid_cross_modal',
    executionTimeMs: 182,
    reasoningChain: [
      { step: 1, type: 'Retrieval', description: 'Retrieved 3 dialogue audio utterances (doc-2) and 2 technical document spans with semantic similarity > 0.89.', evidenceCited: 'Audio Dialogue @ 00:04-00:18 (Dr. Elena Vance)', confidence: 0.98 },
      { step: 2, type: 'Cross-Modal Fusion', description: 'Fused acoustic speaker confidence with transmon material specification graph node.', evidenceCited: 'Entity [ent-transmon] & [ent-decoherence]', confidence: 0.96 },
      { step: 3, type: 'Knowledge Graph Traversal', description: 'Traversed path: (Dr. Elena Vance) ──[hypothesized_by_speaker]──▶ (Transmon Qubit) ◀──[causes_error_in]── (Quantum Decoherence).', evidenceCited: 'Triplets #trip-3, #trip-4', confidence: 0.97 },
      { step: 4, type: 'Deductive Verification', description: 'Verified factual consistency against recorded ASR speech transcript and verified triplet citations.', evidenceCited: '100% Grounded Provenance', confidence: 0.99 }
    ],
    citations: [
      { id: 'cit-1', docId: 'doc-2', docTitle: 'Quantum Decoherence in Transmon Qubits Dialogue', modality: 'audio', confidence: 0.98, snippet: 'When we drop the dilution refrigerator below 15 millikelvin, we observe a 40% enhancement in the T1 relaxation times.', timestampRange: '00:04 - 00:18', groundingScore: 0.98 },
      { id: 'cit-2', docId: 'doc-2', docTitle: 'Quantum Decoherence in Transmon Qubits Dialogue', modality: 'audio', confidence: 0.95, snippet: 'dielectric loss in the amorphous aluminum oxide junction remains the dominating bottleneck causing premature quantum state decoherence.', timestampRange: '00:19 - 00:34', groundingScore: 0.95 },
      { id: 'cit-3', docId: 'doc-1', docTitle: 'NASA Perseverance: Mastcam-Z Mineralogy', modality: 'image', confidence: 0.84, snippet: 'Comparative spectroscopic calibration with SuperCam laser instrumentation.', boundingBoxLabel: 'SuperCam Instrument', groundingScore: 0.88 }
    ],
    subgraphNodes: ['ent-elena', 'ent-transmon', 'ent-decoherence']
  }
};
