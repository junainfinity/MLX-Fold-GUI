"""
Sample Data Library — Pre-loaded biological data for demonstration.

Contains mock sample persons (with DNA/RNA/protein sequences) and
common medicines (with SMILES strings) for drug interaction simulation.

NOTE: These are synthetic/mock sequences for demonstration only.
They are NOT clinically validated data.
"""

# ─── Sample Persons ─────────────────────────────────────

SAMPLE_PERSONS = [
    {
        "id": "person-a",
        "name": "Sample Person A",
        "description": "GFP-derived protein with standard DNA/RNA strands",
        "avatar": "🧬",
        "targets": [
            {
                "type": "Protein",
                "name": "aqGFP Variant",
                "sequence": "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
                "description": "Fluorescent protein variant (230 aa)",
            },
            {
                "type": "DNA",
                "name": "Regulatory Region",
                "sequence": "ATGCGTACGTAGCTAG",
                "description": "16nt regulatory DNA fragment",
            },
        ],
    },
    {
        "id": "person-b",
        "name": "Sample Person B",
        "description": "Hemoglobin-derived protein with extended nucleic acids",
        "avatar": "🔬",
        "targets": [
            {
                "type": "Protein",
                "name": "Hemoglobin Alpha Variant",
                "sequence": "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH",
                "description": "Hemoglobin alpha chain fragment (50 aa)",
            },
            {
                "type": "RNA",
                "name": "mRNA Fragment",
                "sequence": "AUGCGUACGUAGCUAGAUGCGUACGUAGCUAG",
                "description": "32nt mRNA fragment",
            },
        ],
    },
    {
        "id": "person-c",
        "name": "Sample Person C",
        "description": "Insulin-derived protein with DNA binding region",
        "avatar": "🧪",
        "targets": [
            {
                "type": "Protein",
                "name": "Insulin B-chain Variant",
                "sequence": "FVNQHLCGSHLVEALYLVCGERGFFYTPKT",
                "description": "Insulin B-chain (30 aa)",
            },
            {
                "type": "DNA",
                "name": "Promoter Region",
                "sequence": "ATGCGTACGTAGCTAGATGCGTACGTAGCTAG",
                "description": "32nt promoter DNA fragment",
            },
            {
                "type": "RNA",
                "name": "tRNA Fragment",
                "sequence": "AUGCGUACGUAGCUAG",
                "description": "16nt tRNA fragment",
            },
        ],
    },
    {
        "id": "sars-cov-2-context",
        "name": "SARS-CoV-2 Simulation Context",
        "description": "Viral entry simulation components (Spike RBD + ACE2 Receptor)",
        "avatar": "🦠",
        "targets": [
            {
                "type": "Protein",
                "name": "Spike Protein RBD",
                "sequence": "RVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNF",
                "description": "SARS-CoV-2 Spike Receptor Binding Domain (aa 319-541)",
            },
            {
                "type": "Protein",
                "name": "Human ACE2 Fragment",
                "sequence": "MSSSSWLLLSLVAVTAAQSTIEEQAKTFLDKFNHEAEDLFYQSSLASWNYNTNITEENVQNMNNAGDKWSAFLKEQSTLAQMYPLQEIQNLTVK",
                "description": "Human Angiotensin-converting enzyme 2 (100aa N-term fragment)",
            },
        ],
    },
]


# ─── Common Medicines ───────────────────────────────────

COMMON_MEDICINES = [
    {
        "id": "paracetamol",
        "name": "Paracetamol",
        "aliases": ["Acetaminophen", "Tylenol"],
        "smiles": "CC(=O)NC1=CC=C(O)C=C1",
        "description": "Analgesic and antipyretic",
        "category": "Pain Relief",
        "icon": "💊",
    },
    {
        "id": "aspirin",
        "name": "Aspirin",
        "aliases": ["Acetylsalicylic acid"],
        "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O",
        "description": "Anti-inflammatory, analgesic, antipyretic",
        "category": "Pain Relief",
        "icon": "💊",
    },
    {
        "id": "caffeine",
        "name": "Caffeine",
        "aliases": ["1,3,7-Trimethylxanthine"],
        "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        "description": "Central nervous system stimulant",
        "category": "Stimulant",
        "icon": "☕",
    },
    {
        "id": "ibuprofen",
        "name": "Ibuprofen",
        "aliases": ["Advil", "Motrin"],
        "smiles": "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
        "description": "Non-steroidal anti-inflammatory drug (NSAID)",
        "category": "Pain Relief",
        "icon": "💊",
    },
    {
        "id": "metformin",
        "name": "Metformin",
        "aliases": ["Glucophage"],
        "smiles": "CN(C)C(=N)NC(=N)N",
        "description": "Antihyperglycemic agent for type 2 diabetes",
        "category": "Diabetes",
        "icon": "💉",
    },
    {
        "id": "atp",
        "name": "ATP",
        "aliases": ["Adenosine triphosphate"],
        "smiles": "NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O",
        "description": "Universal energy currency of cells",
        "category": "Nucleotide",
        "icon": "⚡",
    },
    {
        "id": "penicillin-g",
        "name": "Penicillin G",
        "aliases": ["Benzylpenicillin"],
        "smiles": "CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)CC3=CC=CC=C3)C(=O)O)C",
        "description": "Narrow-spectrum antibiotic for bacterial infections",
        "category": "Antibiotic",
        "icon": "🧬",
    },
    {
        "id": "dopamine",
        "name": "Dopamine",
        "aliases": ["Intropin"],
        "smiles": "C1=CC(=C(C=C1CCN)O)O",
        "description": "Neurotransmitter involved in motivation and reward",
        "category": "Neurological",
        "icon": "🧠",
    },
    {
        "id": "serotonin",
        "name": "Serotonin",
        "aliases": ["5-HT"],
        "smiles": "C1=CC2=C(C=C1O)C(=CN2)CCN",
        "description": "Neurotransmitter involved in mood regulation",
        "category": "Neurological",
        "icon": "🌈",
    },
]


def get_sample_persons() -> list[dict]:
    """Return all sample persons with their biological targets."""
    return SAMPLE_PERSONS


def get_sample_medicines() -> list[dict]:
    """Return all common medicines with SMILES strings."""
    return COMMON_MEDICINES
