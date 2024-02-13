import { Reference } from "@/utils/global";
import Quill from "quill";
import { animated, useSpring } from "@react-spring/web";

function getTextBeforeCursor(quill: Quill, length = 500) {
  const cursorPosition = quill.getSelection(true)!.index;
  const start = Math.max(0, cursorPosition - length); // 确保开始位置不是负数
  return quill.getText(start, cursorPosition - start);
}

function getNumberBeforeCursor(quill: Quill, length = 3000) {
  const cursorPosition = quill.getSelection(true)!.index;
  const start = Math.max(0, cursorPosition - length); // 确保开始位置不是负数
  const textBeforeCursor = quill.getText(start, cursorPosition - start);

  // 使用正则表达式匹配格式为[数字]的文本
  const regex = /\[(\d+)\]/g;
  let match;
  let lastMatch;

  // 使用循环找到最后一个匹配项
  while ((match = regex.exec(textBeforeCursor)) !== null) {
    lastMatch = match;
  }

  // 如果找到了匹配项，返回匹配到的数字（转换为数字类型）
  if (lastMatch) {
    return parseInt(lastMatch[1], 10);
  }

  // 如果没有找到匹配项，返回 0
  return 0;
}

function updateBracketNumbersInDelta(delta: any) {
  let currentNumber = 1;

  const updatedOps = delta.ops.map((op: any) => {
    if (typeof op.insert === "string") {
      return {
        ...op,
        insert: op.insert.replace(/\[\d+\]/g, () => `[${currentNumber++}]`),
      };
    }
    return op;
  });

  return { ops: updatedOps };
}

function deleteReferenceNumberOrParagraph(
  delta: any,
  indexToRemove: number,
  quill: Quill,
  deleteParagraph: boolean
) {
  const indexStr = `[${indexToRemove + 1}]`;
  if (deleteParagraph) {
    const htmlString = removeParagraphWithReference(
      quill.root.innerHTML,
      indexToRemove + 1
    );
    console.log("htmlString", htmlString);
    let delta = quill.clipboard.convert(htmlString);
    return delta;
  } else {
    const updatedOps = delta.ops.flatMap((op: any, i) => {
      if (typeof op.insert === "string") {
        const indexPos = op.insert.indexOf(indexStr);
        if (indexPos !== -1) {
          // 删除单个索引的逻辑
          const before = op.insert.slice(0, indexPos);
          const after = op.insert.slice(indexPos + indexStr.length);
          op.insert = before + after;
          console.log("删除索引");
        }
        // }
      }
      // 对于不需要修改的op，直接返回
      return [op];
    });
    return { ops: updatedOps };
  }
}

// function deleteParagraphsWithReferences(html: HTML, referenceNumber: number) {
//   const regex = new RegExp(
//     `<p><br><\\/p>.*?<sup>\\[${referenceNumber}\\]<\\/sup>.*?<p><br><\\/p>`,
//     "s"
//   );
//   console.log("regex", regex.toString());

//   const matches = html.match(regex);
//   console.log(matches);
//   return html.replace(regex, "");
// }

function removeParagraphWithReference(
  htmlString: string,
  referenceNumber: number
) {
  const referenceTag = `<sup>[${referenceNumber}]</sup>`;
  let startIndex = htmlString.indexOf(referenceTag);

  // 如果引用号不存在，直接返回原始字符串
  if (startIndex === -1) {
    return htmlString;
  }
  const paragraphTag = "<p><br></p>";
  // 向前找到<p><br></p>作为段落的开始标志
  let startParagraphIndex = htmlString.lastIndexOf(paragraphTag, startIndex);
  if (startParagraphIndex !== -1) {
    startParagraphIndex += paragraphTag.length;
  } else {
    // 如果没有找到，说明是文档的开始部分
    startParagraphIndex = 0;
  }
  // 向后找到下一个<p><br></p>作为段落的结束标志，这实际上标记了下一个段落的开始
  let endParagraphIndex = htmlString.indexOf(paragraphTag, startIndex);
  // 调整结束索引以包含段落结束的</p>标签
  if (endParagraphIndex !== -1) {
    endParagraphIndex += paragraphTag.length;
  } else {
    // 如果没有找到，则将结束索引设置为字符串的末尾
    endParagraphIndex = htmlString.length;
  }

  // 删除包含特定引用号的段落
  return (
    htmlString.slice(0, startParagraphIndex) +
    htmlString.slice(endParagraphIndex)
  );
}

function updateBracketNumbersInDeltaKeepSelection(quill: Quill) {
  const selection = quill.getSelection(true);
  const delta = quill.getContents();
  const updatedDelta = updateBracketNumbersInDelta(delta);
  quill.setContents(updatedDelta);
  if (selection) {
    quill.setSelection(selection.index, selection.length);
  }
}

export function delteIndexUpdateBracketNumbersInDeltaKeepSelection(
  quill: Quill,
  index: number,
  rmPg: boolean
) {
  const selection = quill.getSelection(true);
  const delta = quill.getContents();
  let updatedDelta = deleteReferenceNumberOrParagraph(
    delta,
    index,
    quill,
    rmPg
  );
  updatedDelta = updateBracketNumbersInDelta(updatedDelta);
  quill.setContents(updatedDelta);
  if (selection) {
    quill.setSelection(selection.index, selection.length);
  }
}

function convertToSuperscript(quill: Quill) {
  const text = quill.getText();
  const regex = /\[\d+\]/g; // 正则表达式匹配 "[数字]" 格式
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    const length = match[0].length;

    // 应用上标格式
    quill.formatText(startIndex, length, {
      script: "super",
      // link: "javascript:void(0);",
    });
    // 重置格式（如果需要）
    if (startIndex + length < text.length) {
      quill.formatText(startIndex + length, 1, "script", false);
    }
  }
}

function getRandomOffset(max: number) {
  return Math.floor(Math.random() * max);
}

function removeSpecialCharacters(str: string): string {
  // 正则表达式匹配除了字母、空格和中文之外的所有字符
  const regex = /[^\u4e00-\u9fa5a-zA-Z ]/g;
  return str.replace(regex, "");
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => console.log("文献引用复制到剪贴板"),
    (err) => console.error("复制到剪贴板失败:", err)
  );
}

function formatReferenceForCopy(reference: Reference): string {
  let referenceStr = `${reference.author}. ${reference.title}. `;
  if (reference.journal && reference.journal.name) {
    referenceStr += `${reference.journal.name}[J], ${reference.year}, `;
    if (reference.journal.volume) referenceStr += `${reference.journal.volume}`;
    if (reference.journal.pages) referenceStr += `: ${reference.journal.pages}`;
    referenceStr += ".";
  } else {
    referenceStr += `${reference.venue}, ${reference.year}.`;
  }
  return referenceStr;
}
function formatAllReferencesForCopy(references: Reference[]): string {
  return references
    .map(
      (reference, index) =>
        `[${index + 1}] ${formatReferenceForCopy(reference)}`
    )
    .join("\n");
}

export function formatTextInEditor(editor: Quill) {
  convertToSuperscript(editor);
  updateBracketNumbersInDeltaKeepSelection(editor);
}

export function formatJournalReference(entry: any) {
  if (!entry.journal) {
    return ""; // 如果没有期刊信息，直接返回空字符串
  }

  // 基础引用格式：期刊名称和出版年份
  let reference = `${entry.journal.name}[J], ${entry.year}`;

  // 如果有卷号，添加卷号信息
  if (entry.journal.volume) {
    reference += `, ${entry.journal.volume}`;
  }

  // 如果有页码，添加页码信息
  if (entry.journal.pages) {
    reference += `: ${entry.journal.pages}`;
  }

  return reference;
}

export {
  getTextBeforeCursor,
  updateBracketNumbersInDelta,
  updateBracketNumbersInDeltaKeepSelection,
  convertToSuperscript,
  getRandomOffset,
  removeSpecialCharacters,
  copyToClipboard,
  formatReferenceForCopy,
  formatAllReferencesForCopy,
  getNumberBeforeCursor,
};
