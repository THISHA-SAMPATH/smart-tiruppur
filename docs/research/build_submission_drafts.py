from pathlib import Path
import re
import struct
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "research" / "submission_drafts"
OUT.mkdir(parents=True, exist_ok=True)

ACCESS_TEMPLATE = Path(r"D:\Downloads\IEEE    Access-Template-2024.docx")
CONF_TEMPLATE = Path(r"D:\Downloads\conference-template-a4.docx")
MANUSCRIPT = ROOT / "docs" / "research" / "manuscript-draft.md"

CONF_TITLE = "NoyyalSense for Integrated River Monitoring, Pollution Attribution, and Evidence Traceability in Tiruppur"
JOURNAL_TITLE = "Selective Pollution-Source Attribution Under Simulated Sensor Faults: A Comparative Benchmark"


def md_blocks(path):
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    blocks = []
    current = []
    in_table = False
    for line in lines:
        s = line.strip()
        if s.startswith("## Author-verification items"):
            break
        if s.startswith("!["):
            m = re.search(r"\]\(([^)]+)\)", s)
            if m:
                blocks.append(("image", str((path.parent / m.group(1)).resolve())))
            continue
        if s.startswith("|"):
            if current:
                blocks.append(("p", " ".join(current)))
                current = []
            in_table = True
            if not re.fullmatch(r"\|?\s*:?[-| ]+:?\s*\|?", s):
                vals = [v.strip() for v in s.strip("|").split("|")]
                blocks.append(("table", "  |  ".join(vals)))
            continue
        in_table = False
        if not s:
            if current:
                blocks.append(("p", " ".join(current)))
                current = []
            continue
        if s.startswith("# "):
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("title", s[2:].strip()))
        elif s == "## Abstract":
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("abstract_heading", ""))
        elif s == "## Keywords":
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("keywords_heading", ""))
        elif s.startswith("## "):
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("h1", s[3:].strip()))
        elif s.startswith("### "):
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("h2", s[4:].strip()))
        elif s.startswith("#### "):
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("h3", s[5:].strip()))
        elif s.startswith("---"):
            continue
        elif s.startswith("- ") or re.match(r"^\d+\.\s", s):
            if current:
                blocks.append(("p", " ".join(current))); current = []
            blocks.append(("bullet", re.sub(r"^(?:- |\d+\.\s)", "", s)))
        else:
            current.append(s)
    if current:
        blocks.append(("p", " ".join(current)))
    clean = []
    for kind, text in blocks:
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
        text = re.sub(r"\*(.*?)\*", r"\1", text)
        text = re.sub(r"`([^`]*)`", r"\1", text)
        text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
        clean.append((kind, text))
    return clean


def conference_blocks():
    return [
        ("title", CONF_TITLE),
        ("authors", "[Author names and affiliations to be supplied]"),
        ("abstract", "Abstract—Industrial water-pollution monitoring requires spatial context, cautious source screening, and traceable records. This paper presents NoyyalSense, a civic environmental-monitoring prototype for Tiruppur, Tamil Nadu. The web application combines river and facility mapping, simulated water-quality telemetry, role-based workspaces, groundwater-risk views, digital product passport records, and API clients for separate inference and ledger services. The repository contains a local SHA-256 alert-chain helper, but not the source code for those remote services. We document the integration points and distinguish them from verified service behavior. The application uses representative facility information and simulated or screening-level data; its source rankings are not calibrated for legal attribution, and field validation has not been established. This paper describes a software prototype, not evidence of improved water quality or enforcement outcomes."),
        ("keywords", "Index Terms—Environmental monitoring, industrial pollution, water quality, source attribution, evidence management, digital product passport, Tiruppur."),
        ("h1", "I. INTRODUCTION"),
        ("p", "Industrial water pollution is difficult to investigate when measurements are sparse, sources overlap, and data are distributed across agencies and facilities. Monitoring systems often separate map-based context, water-quality observations, incident handling, and public reporting [1], [2]. NoyyalSense was developed as a regional civic-intelligence prototype for the Noyyal River basin and the textile-industry context of Tiruppur, Tamil Nadu. Its design connects environmental screening with role-specific workflows and traceable records."),
        ("p", "The system is intended to support situational awareness and evidence organization. It does not establish a legally defensible determination that a named facility caused a discharge. Current application records include simulated telemetry and representative facility data, and several transport and attribution displays are heuristic or uncalibrated. These limits are central to interpreting the platform."),
        ("h1", "II. SYSTEM OBJECTIVES AND SCOPE"),
        ("p", "NoyyalSense has four design objectives: (1) present river, monitoring-station, and industrial-area context in a geographic interface; (2) summarize water-quality signals and flag conditions for further review; (3) organize incidents, facility actions, and regulator workflows; and (4) organize event and product-level records with traceability features. The platform also includes groundwater-risk views organized around FIRKA administrative units and digital product passport (DPP) functions."),
        ("p", "The implementation combines a web application with API-backed data services and a relational data store. The interface provides distinct workspaces for regulators, industry users, groundwater officers, and citizens. The monitoring pipeline can present sensor readings, calculate screening status, and record events. Source ranking and transport visualization are decision-support features; their current heuristic or synthetic basis does not support field attribution claims."),
        ("h1", "III. PLATFORM ARCHITECTURE"),
        ("p", "The system is organized into four logical layers. The data layer stores facilities, monitoring locations, observations, incidents, user actions, groundwater indicators, and product records. The ingestion and screening layer connects to configured inference endpoints. The web application exposes ledger API operations for event posting and retrieval, verification lookup, and regulator actions. A separate local helper can calculate and verify a SHA-256-linked sequence of alert objects. The application layer exposes map views and role-specific dashboards."),
        ("p", "A typical intended workflow begins with a reading associated with a monitoring location and time. The client can submit a simulation request to the configured inference service, adapt the response to the dashboard event schema, and post the event to the configured ledger service. The repository demonstrates these client calls and the local alert helper. It does not contain the remote ledger or inference service implementations, so persistence, endpoint availability, and end-to-end chain verification are not established by this source review."),
        ("h1", "IV. CORE WORKFLOWS"),
        ("h2", "A. River monitoring and source screening"),
        ("p", "The map combines river geometry, monitoring stations, industrial areas, and facility context. Telemetry fields include pH, electrical conductivity, turbidity, and flow in the application workflow. The repository also includes a local attribution route that returns upstream candidates explicitly labeled as simulated inspection priorities. It is distinct from the configured remote inference API. Any facility-level ranking must be interpreted as a screening cue because the current application pathway is not calibrated or validated with measured Noyyal observations."),
        ("h2", "B. Evidence ledger and product records"),
        ("p", "The application client exposes calls to a separately hosted ledger service for event creation, retrieval, and verification lookup. Locally, a helper computes SHA-256 hashes over alert payloads and checks previous-hash continuity. This code-level helper is not evidence that remote ledger records are immutable or that the external service validates the full chain [5]. Digital product passport views provide QR-linked product information in the emerging policy context for product-level digital information [4]. These mechanisms support traceability workflows; they do not certify environmental performance unless underlying claims and data are independently verified."),
        ("h2", "C. Role-based coordination and groundwater views"),
        ("p", "Separate workspaces organize regulator review, facility responses, groundwater screening, and citizen-facing information. Groundwater views summarize risk by FIRKA geography, an administrative scale used in national groundwater resource assessment [3]. Their value depends on the provenance, temporal coverage, and quality of the source data; the prototype should not be interpreted as a substitute for official assessment."),
        ("h1", "V. IMPLEMENTATION"),
        ("p", "The web client is implemented with Next.js and TypeScript. The repository includes API client functions for inference and ledger operations, a PostgreSQL data model managed through Prisma, GIS layers for the Noyyal region, and simulation utilities used in development and research. Configuration points the clients to separately hosted service URLs by default. The service implementation directories are not present in this repository snapshot. The separate research pipeline evaluates selective classification using synthetic tracer episodes and is distinct from the remote inference API."),
        ("p", "The evidence in this paper is source-level: endpoint paths, request adapters, configuration, local helper code, and user-interface workflows. No live API response logs, service source, persisted ledger export, chain-verification report, or operational evaluation was supplied. Accordingly, the paper does not claim successful end-to-end ledger verification or measured inference-service performance. It also does not report a controlled usability study, field deployment evaluation, latency benchmark, or measured environmental outcome."),
        ("h1", "VI. DISCUSSION AND LIMITATIONS"),
        ("p", "The main system contribution is the integration of geographic monitoring context, role-specific operational views, API-based connections to inference and ledger services, and product-level information in a regional prototype. The local hash helper provides code-level evidence for checking an alert chain, while the external service behavior remains unverified. These are software capabilities and integration points, not demonstrated environmental or regulatory impacts."),
        ("p", "Important limitations remain. Telemetry and representative facilities may be simulated; source attribution and transport displays are not validated against field measurements; groundwater layers require authoritative, current source data; and a hash chain protects record integrity but cannot prevent inaccurate inputs. Future work should connect validated sensors and official datasets, calibrate transport and attribution models, test access and ledger verification, and evaluate the workflow with intended users under appropriate governance."),
        ("h1", "VII. CONCLUSION"),
        ("p", "NoyyalSense is a civic platform prototype that connects river monitoring views, pollution-source screening, regulator and facility workflows, groundwater-risk presentation, ledger-service clients, and digital product passport records for the Tiruppur context. The repository demonstrates API integration code and a local SHA-256 alert-chain helper, but does not include the remote ledger or inference service source or establish their live behavior. Field validation and evaluation of attribution accuracy, data quality, ledger integrity, usability, and operational impact are required before the system can support real-world regulatory decisions."),
        ("h1", "ACKNOWLEDGMENT"),
        ("p", "[Add funding, institutional, and contributor acknowledgments, if applicable.]"),
        ("h1", "REFERENCES"),
        ("ref", "[1] H. Y. Teh, A. W. Kempa-Liehr, and K. I.-K. Wang, “Sensor data quality: A systematic review,” Journal of Big Data, vol. 7, art. no. 11, 2020, doi: 10.1186/s40537-020-0285-1."),
        ("ref", "[2] C. Leigh et al., “A framework for automated anomaly detection in high frequency water-quality data from in situ sensors,” Science of the Total Environment, vol. 664, pp. 885–898, 2019, doi: 10.1016/j.scitotenv.2019.02.085."),
        ("ref", "[3] Central Ground Water Board, National Compilation on Dynamic Ground Water Resources of India, 2024. Ministry of Jal Shakti, Government of India, 2024."),
        ("ref", "[4] European Parliament and Council of the European Union, “Regulation (EU) 2024/1781 establishing a framework for the setting of ecodesign requirements for sustainable products,” Official Journal of the European Union, 2024."),
        ("ref", "[5] S. Nakamoto, “Bitcoin: A peer-to-peer electronic cash system,” 2008. [Online]. Available: https://bitcoin.org/bitcoin.pdf")
    ]


def xml_qn(ns, local):
    return "{%s}%s" % (ns, local)


def make_para(text, style, ns):
    w = lambda n: xml_qn(ns, n)
    p = ET.Element(w("p"))
    pp = ET.SubElement(p, w("pPr"))
    if style:
        ps = ET.SubElement(pp, w("pStyle"))
        ps.set(w("val"), style)
    r = ET.SubElement(p, w("r"))
    t = ET.SubElement(r, w("t"))
    if text[:1].isspace() or text[-1:].isspace():
        t.set("{%s}space" % "http://www.w3.org/XML/1998/namespace", "preserve")
    t.text = text
    return p


def make_image_para(path, ns, rel_id, picture_id):
    w_uri = ns
    wp_uri = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    a_uri = "http://schemas.openxmlformats.org/drawingml/2006/main"
    pic_uri = "http://schemas.openxmlformats.org/drawingml/2006/picture"
    r_uri = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    q = lambda uri, local: "{%s}%s" % (uri, local)
    with open(path, "rb") as f:
        header = f.read(24)
    width_px, height_px = struct.unpack(">II", header[16:24])
    cx = 3200400  # 3.5 in, IEEE single-column figure width
    cy = int(cx * height_px / max(width_px, 1))
    p = ET.Element(q(w_uri, "p"))
    r = ET.SubElement(p, q(w_uri, "r"))
    drawing = ET.SubElement(r, q(w_uri, "drawing"))
    inline = ET.SubElement(drawing, q(wp_uri, "inline"), {"distT":"0", "distB":"0", "distL":"0", "distR":"0"})
    ET.SubElement(inline, q(wp_uri, "extent"), {"cx":str(cx), "cy":str(cy)})
    ET.SubElement(inline, q(wp_uri, "effectExtent"), {"l":"0", "t":"0", "r":"0", "b":"0"})
    ET.SubElement(inline, q(wp_uri, "docPr"), {"id":str(picture_id), "name":Path(path).name})
    frame = ET.SubElement(inline, q(wp_uri, "cNvGraphicFramePr"))
    ET.SubElement(frame, q(a_uri, "graphicFrameLocks"), {"noChangeAspect":"1"})
    graphic = ET.SubElement(inline, q(a_uri, "graphic"))
    gd = ET.SubElement(graphic, q(a_uri, "graphicData"), {"uri":pic_uri})
    pic = ET.SubElement(gd, q(pic_uri, "pic"))
    nv = ET.SubElement(pic, q(pic_uri, "nvPicPr"))
    ET.SubElement(nv, q(pic_uri, "cNvPr"), {"id":str(picture_id), "name":Path(path).name})
    ET.SubElement(nv, q(pic_uri, "cNvPicPr"))
    fill = ET.SubElement(pic, q(pic_uri, "blipFill"))
    ET.SubElement(fill, q(a_uri, "blip"), {q(r_uri, "embed"):rel_id})
    stretch = ET.SubElement(fill, q(a_uri, "stretch")); ET.SubElement(stretch, q(a_uri, "fillRect"))
    sp = ET.SubElement(pic, q(pic_uri, "spPr"))
    xfrm = ET.SubElement(sp, q(a_uri, "xfrm")); ET.SubElement(xfrm, q(a_uri, "off"), {"x":"0", "y":"0"}); ET.SubElement(xfrm, q(a_uri, "ext"), {"cx":str(cx), "cy":str(cy)})
    geom = ET.SubElement(sp, q(a_uri, "prstGeom"), {"prst":"rect"}); ET.SubElement(geom, q(a_uri, "avLst"))
    return p


def render(template, destination, blocks, access=False):
    with zipfile.ZipFile(template, "r") as zin:
        files = {n: zin.read(n) for n in zin.namelist()}
    root = ET.fromstring(files["word/document.xml"])
    body = next(e for e in root.iter() if e.tag.endswith("}body"))
    ns = body.tag[1:].split("}")[0]
    w = lambda n: xml_qn(ns, n)
    rel_ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    rel_root = ET.fromstring(files["word/_rels/document.xml.rels"])
    existing_ids = [int(e.get("Id")[3:]) for e in rel_root if (e.get("Id") or "").startswith("rId") and e.get("Id")[3:].isdigit()]
    next_rel = max(existing_ids + [0]) + 1
    pic_count = 0
    sect = body.find(w("sectPr"))
    for child in list(body):
        body.remove(child)
    for kind, text in blocks:
        if kind == "image":
            if not Path(text).is_file():
                continue
            pic_count += 1
            rel_id = "rId%d" % next_rel; next_rel += 1
            media_name = "noyyal_figure_%d.png" % pic_count
            ET.SubElement(rel_root, "{%s}Relationship" % rel_ns, {
                "Id": rel_id,
                "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
                "Target": "media/" + media_name,
            })
            files["word/media/" + media_name] = Path(text).read_bytes()
            body.append(make_image_para(text, ns, rel_id, pic_count))
            continue
        if kind == "title": style = "PaperTitle" if access else "papertitle"
        elif kind == "authors": style = "AU"
        elif kind == "abstract": style = "Abstract" if access else "Abstract"
        elif kind == "keywords": style = "IT" if access else "Keywords"
        elif kind == "ref": style = "references" if not access else "PARA"
        elif kind in ("abstract_heading", "keywords_heading"):
            continue
        elif kind == "h1": style = "H1ListNoSpace" if access else "Heading1"
        elif kind == "h2": style = "H2Cont" if access else "Heading2"
        elif kind == "h3": style = "H3" if access else "Heading3"
        elif kind == "bullet": style = "PARA" if access else "BodyText"
        elif kind == "table": style = "PARA" if access else "BodyText"
        else: style = "PARA" if access else "BodyText"
        body.append(make_para(text, style, ns))
    if sect is not None:
        body.append(sect)
    files["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    files["word/_rels/document.xml.rels"] = ET.tostring(rel_root, encoding="utf-8", xml_declaration=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, payload in files.items():
            zout.writestr(name, payload)


if __name__ == "__main__":
    src = md_blocks(MANUSCRIPT)
    # Build the IEEE Access front matter, then retain the evidence-based manuscript body.
    abstract_head_i = next(i for i, (k, _) in enumerate(src) if k == "abstract_heading")
    keywords_head_i = next(i for i, (k, _) in enumerate(src) if k == "keywords_heading")
    intro_i = next(i for i, (k, v) in enumerate(src) if k == "h1" and v.lower().endswith("introduction"))
    abstract = " ".join(v for k, v in src[abstract_head_i + 1:keywords_head_i] if k == "p")
    keywords = " ".join(v for k, v in src[keywords_head_i + 1:intro_i] if k == "p")
    body_src = []
    for k, v in src[intro_i:]:
        if k == "p" and ("First complete manuscript draft" in v):
            continue
        if k == "p" and (v == abstract or v == keywords):
            continue
        body_src.append((k, v))
    src = [
        ("title", JOURNAL_TITLE),
        ("authors", "[Author names and IEEE memberships to be supplied]"),
        ("authors", "[Department and institution, city, country; corresponding-author email to be supplied]"),
        ("abstract", "ABSTRACT—" + abstract),
        ("keywords", "INDEX TERMS—" + keywords),
    ] + body_src
    render(ACCESS_TEMPLATE, OUT / "NoyyalSense_IEEE_Access_Journal_Draft.docx", src, access=True)
    render(CONF_TEMPLATE, OUT / "NoyyalSense_IEEE_Conference_Draft.docx", conference_blocks())
    print(OUT)
