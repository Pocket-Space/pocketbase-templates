import { CollectionModel } from "pocketbase";
import fg from "fast-glob";
import fs from "fs";
import { SchemaField } from "pocketbase";
import { run } from "@softwaretechnik/dbml-renderer";
import path from "path";

const filePaths = fg.sync("templates/*/schema.json");

const files = filePaths.map((file) => {
  const schema = JSON.parse(fs.readFileSync(file, "utf-8"));
  return schema as CollectionModel[];
});

const createTemplateDetails = (templateName: string, svgPath: string, schemaJson: string) => {
  return `\n<details ><summary style="font-size:24px">${templateName}</summary><img src="${svgPath}" /></details>`;
};

type TypeMappingFn = (
  field: SchemaField,
  currentCollection: CollectionModel,
  collections: CollectionModel[]
) => string | { type: string; global: string };

const typeMapping: Record<string, string | TypeMappingFn> = {
  select: (field, currentCollection, collections) => {
    let enumDef = `Enum ${currentCollection.name}_${field.name} {\n`;
    for (let option of field.options.values) {
      enumDef += `  "${option}"\n`;
    }
    enumDef += "}\n";

    return {
      type: currentCollection.name + "_" + field.name,
      global: enumDef,
    };
  },
  editor: "text",
  file: "text",
  number: "int",
  bool: "boolean",
  text: "text",
  date: "timestamp",
  relation: (field, currentCollection, collections) => {
    return `text ${constraints(field, currentCollection, collections)}\n`;
  },
};

const constraints = (field: SchemaField, currentCollection?: CollectionModel, collections?: CollectionModel[]) => {
  let constraints = " [";
  if (field.required) {
    constraints += "not null";
  } else {
    constraints += "null";
  }

  if (field.type === "relation") {
    const collectionName = collections?.find((c) => c.id === field.options.collectionId)?.name;
    const op = field.options.maxSelect == 1 ? "-" : ">";
    constraints += `, ref: ${op} ` + collectionName + ".id";
  }
  return constraints + "]";
};

let readme = `# PocketBase Templates

Welcome to the PocketBase Templates repository! <br/>
This is a community-driven collection of templates tailored for PocketBase.

# Templates
`;

for (let index = 0; index < files.length; index++) {
  let output = "";
  let global = "";
  const file = files[index];
  for (let collection of file) {
    output += `Table ${collection.name} {\n`;
    output += `  id text [pk, not null]\n`;
    for (let field of collection.schema) {
      const fn = typeMapping[field.type];
      let type = typeof fn === "function" ? fn(field, collection, file) : fn;

      if (!type) {
        throw new Error(`Type ${field.type} not found in TypeMappings`);
      }

      output += `  ${field.name} `;
      if (typeof type === "object") {
        output += (type as any).type;
        global += (type as any).global;
      } else {
        output += ` ${type}`;
      }

      if (field.type !== "relation") {
        output += `${constraints(field)}\n`;
      }
    }
    output += "  created_at timestamp\n";
    output += "}\n";
  }
  output += global;

  console.log(output);
  fs.writeFileSync(path.join(filePaths[index].replace("schema.json", "schema.dbml")), output);
  const result = run(output, "svg");
  fs.writeFileSync(path.join(filePaths[index].replace("schema.json", "schema.svg")), result);

  const name = filePaths[index].split("/")[1];
  const templateName = name.charAt(0).toUpperCase() + name.slice(1);
  readme += createTemplateDetails(
    templateName,
    `templates/${name}/schema.svg`,
    fs.readFileSync(filePaths[index], "utf-8")
  );

  fs.writeFileSync("README.md", readme);
}
