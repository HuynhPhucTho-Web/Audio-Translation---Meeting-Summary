/**
 * Pure JavaScript Microsoft Word (.docx) OpenXML Generator
 * ECMA-376 compliant with zero external dependencies.
 * Produces fully valid .docx files with tables, headers, styling, and full UTF-8 Vietnamese support.
 */

// Precomputed CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function calculateCrc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates an uncompressed ZIP archive (PKZIP 2.0 Store method 0)
 * Accepted natively by Microsoft Word, Google Docs, LibreOffice, WPS, iOS/Android.
 */
function createZipArchive(files) {
  const encoder = new TextEncoder();
  const entries = [];
  let currentOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = calculateCrc32(dataBytes);

    // Local file header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true);          // Version needed: 2.0
    view.setUint16(6, 0x0800, true);      // Flags: bit 11 = UTF-8 filename
    view.setUint16(8, 0, true);           // Compression: 0 (Store)
    view.setUint16(10, 0, true);          // Mod time
    view.setUint16(12, 0, true);          // Mod date
    view.setUint32(14, crc, true);        // CRC32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true);          // Extra field length
    localHeader.set(nameBytes, 30);

    entries.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
      size: dataBytes.length,
      localHeader,
    });

    currentOffset += localHeader.length + dataBytes.length;
  }

  // Build Central Directory entries
  const centralEntries = [];
  let centralDirSize = 0;

  for (const entry of entries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true); // Central directory signature
    cdView.setUint16(4, 20, true);          // Version made by: 2.0
    cdView.setUint16(6, 20, true);          // Version needed: 2.0
    cdView.setUint16(8, 0x0800, true);      // Flags: UTF-8 filename
    cdView.setUint16(10, 0, true);          // Compression: 0
    cdView.setUint16(12, 0, true);          // Mod time
    cdView.setUint16(14, 0, true);          // Mod date
    cdView.setUint32(16, entry.crc, true);  // CRC32
    cdView.setUint32(20, entry.size, true); // Compressed size
    cdView.setUint32(24, entry.size, true); // Uncompressed size
    cdView.setUint16(28, entry.nameBytes.length, true); // Filename length
    cdView.setUint16(30, 0, true);          // Extra field length
    cdView.setUint16(32, 0, true);          // Comment length
    cdView.setUint16(34, 0, true);          // Disk number start
    cdView.setUint16(36, 0, true);          // Internal attributes
    cdView.setUint32(38, 0, true);          // External attributes
    cdView.setUint32(42, entry.offset, true); // Relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    centralEntries.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Start disk
  eocdView.setUint16(8, entries.length, true);  // Entries on this disk
  eocdView.setUint16(10, entries.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Size of central dir
  eocdView.setUint32(16, currentOffset, true);  // Offset of central dir
  eocdView.setUint16(20, 0, true);              // Comment length

  // Combine into single Uint8Array
  const totalLength = currentOffset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const entry of entries) {
    result.set(entry.localHeader, pos);
    pos += entry.localHeader.length;
    result.set(entry.dataBytes, pos);
    pos += entry.dataBytes.length;
  }

  for (const cd of centralEntries) {
    result.set(cd, pos);
    pos += cd.length;
  }

  result.set(eocd, pos);
  return result;
}

function escapeXml(unsafe = '') {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds = 0) {
  if (!Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate binary DOCX Blob from Meeting Data
 */
export function generateMeetingDocx(meetingData) {
  const {
    date = new Date().toLocaleDateString('vi-VN'),
    duration = 0,
    participants = [],
    topics = [],
    decisions = [],
    actionItems = [],
    summaryText = '',
    transcript = [],
    cleanFullText = '',
  } = meetingData;

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:eastAsia="Segoe UI" w:cs="Segoe UI"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  // 5. word/document.xml body builder
  let bodyXml = '';

  // Main Header
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="100" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="40"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>BIÊN BẢN &amp; TÓM TẮT CUỘC HỌP</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="260"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="20"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>AI Meeting Translator &amp; Live Subtitle Record</w:t>
      </w:r>
    </w:p>
  `;

  // Info Box Table (Metadata)
  bodyXml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9638" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4819"/>
        <w:gridCol w:w="4819"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="160"/><w:right w:w="160"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="334155"/></w:rPr><w:t>Thời gian:</w:t></w:r><w:r><w:t xml:space="preserve"> ${escapeXml(date)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="160"/><w:right w:w="160"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="334155"/></w:rPr><w:t>Thời lượng:</w:t></w:r><w:r><w:t xml:space="preserve"> ${escapeXml(formatDuration(duration))}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="160"/><w:right w:w="160"/></w:tcMar></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="334155"/></w:rPr><w:t>Người tham gia:</w:t></w:r><w:r><w:t xml:space="preserve"> ${escapeXml(participants.length > 0 ? participants.join(', ') : 'Chưa ghi nhận')}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:spacing w:after="200"/></w:p>
  `;

  // Section 1: Key Topics
  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="2563EB"/></w:rPr><w:t>1. Chủ đề chính (Key Topics)</w:t></w:r>
    </w:p>
  `;
  if (topics && topics.length > 0) {
    topics.forEach((topic, idx) => {
      bodyXml += `
        <w:p>
          <w:pPr><w:ind w:left="360"/><w:spacing w:after="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>${idx + 1}. </w:t></w:r>
          <w:r><w:t>${escapeXml(topic)}</w:t></w:r>
        </w:p>
      `;
    });
  } else {
    bodyXml += `<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="94A3B8"/></w:rPr><w:t>(Chưa có chủ đề)</w:t></w:r></w:p>`;
  }

  // Section 2: Decisions
  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="059669"/></w:rPr><w:t>2. Quyết định đã thống nhất (Decisions)</w:t></w:r>
    </w:p>
  `;
  if (decisions && decisions.length > 0) {
    decisions.forEach((decision) => {
      bodyXml += `
        <w:p>
          <w:pPr><w:ind w:left="360"/><w:spacing w:after="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>✔ </w:t></w:r>
          <w:r><w:t>${escapeXml(decision)}</w:t></w:r>
        </w:p>
      `;
    });
  } else {
    bodyXml += `<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="94A3B8"/></w:rPr><w:t>(Chưa có quyết định)</w:t></w:r></w:p>`;
  }

  // Section 3: Action Items Table
  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="7C3AED"/></w:rPr><w:t>3. Phân công công việc (Action Items)</w:t></w:r>
    </w:p>
  `;
  if (actionItems && actionItems.length > 0) {
    bodyXml += `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9638" w:type="dxa"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="1600"/>
          <w:gridCol w:w="1800"/>
          <w:gridCol w:w="4438"/>
          <w:gridCol w:w="1800"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Trạng thái</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Người phụ trách</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Nội dung nhiệm vụ</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Hạn hoàn thành</w:t></w:r></w:p></w:tc>
        </w:tr>
    `;

    actionItems.forEach((item) => {
      const statusSymbol = item.completed ? '[X] Đã xong' : '[ ] Chưa xong';
      bodyXml += `
        <w:tr>
          <w:tc><w:tcPr><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:color w:val="${item.completed ? '059669' : 'D97706'}"/><w:sz w:val="20"/></w:rPr><w:t>${statusSymbol}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(item.assignee || 'Chung')}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(item.task)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:color w:val="7C3AED"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(item.deadline || 'Chưa đặt')}</w:t></w:r></w:p></w:tc>
        </w:tr>
      `;
    });

    bodyXml += `</w:tbl><w:p><w:spacing w:after="200"/></w:p>`;
  } else {
    bodyXml += `<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="94A3B8"/></w:rPr><w:t>(Chưa có công việc phân công)</w:t></w:r></w:p>`;
  }

  // Section 4: AI Summary
  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="EA580C"/></w:rPr><w:t>4. Tóm tắt nội dung cuộc họp (Summary)</w:t></w:r>
    </w:p>
  `;
  if (summaryText) {
    const summaryParas = summaryText.split('\n').filter(Boolean);
    summaryParas.forEach((para) => {
      bodyXml += `
        <w:p>
          <w:pPr><w:ind w:left="240" w:right="240"/><w:spacing w:after="120"/></w:pPr>
          <w:r><w:t>${escapeXml(para)}</w:t></w:r>
        </w:p>
      `;
    });
  } else {
    bodyXml += `<w:p><w:pPr><w:ind w:left="240"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="94A3B8"/></w:rPr><w:t>(Chưa có nội dung tóm tắt)</w:t></w:r></w:p>`;
  }

  // Section 5: Transcript Details Table
  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="260" w:after="140"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0F172A"/></w:rPr><w:t>5. Chi tiết phụ đề &amp; Hội thoại (Detailed Transcript)</w:t></w:r>
    </w:p>
  `;

  if (transcript && transcript.length > 0) {
    bodyXml += `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9638" w:type="dxa"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="1600"/>
          <w:gridCol w:w="1800"/>
          <w:gridCol w:w="4438"/>
          <w:gridCol w:w="1800"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Thời gian</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Người nói</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Nội dung bản gốc</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Bản dịch song ngữ</w:t></w:r></w:p></w:tc>
        </w:tr>
    `;

    transcript.forEach((item, idx) => {
      const transStr = Object.values(item.translations || {})[0] || '';
      const rowFill = idx % 2 === 1 ? 'FAFAFA' : 'FFFFFF';

      bodyXml += `
        <w:tr>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${rowFill}"/><w:tcMar><w:top w:w="80"/><w:bottom w:w="80"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.timestamp)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${rowFill}"/><w:tcMar><w:top w:w="80"/><w:bottom w:w="80"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.speaker)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${rowFill}"/><w:tcMar><w:top w:w="80"/><w:bottom w:w="80"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.originalText)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${rowFill}"/><w:tcMar><w:top w:w="80"/><w:bottom w:w="80"/><w:left w:w="100"/><w:right w:w="100"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:color w:val="2563EB"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(transStr)}</w:t></w:r></w:p></w:tc>
        </w:tr>
      `;
    });

    bodyXml += `</w:tbl><w:p><w:spacing w:after="200"/></w:p>`;
  } else if (cleanFullText) {
    const textParas = cleanFullText.split('\n\n').filter(Boolean);
    textParas.forEach((p) => {
      bodyXml += `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`;
    });
  } else {
    bodyXml += `<w:p><w:pPr><w:ind w:left="240"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="94A3B8"/></w:rPr><w:t>(Chưa có phụ đề)</w:t></w:r></w:p>`;
  }

  // Footer section
  bodyXml += `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="94A3B8"/></w:rPr><w:t>Biên bản được khởi tạo tự động bởi AI Meeting Translator &amp; Live Subtitle System</w:t></w:r>
    </w:p>
  `;

  // Complete document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: relsXml },
    { name: 'word/_rels/document.xml.rels', data: docRelsXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/document.xml', data: documentXml },
  ];

  const zipBytes = createZipArchive(files);
  return new Blob([zipBytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
