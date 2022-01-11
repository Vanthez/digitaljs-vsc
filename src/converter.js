const {Yosys} = require('yosys');
const yosys2digitaljs = require('yosys2digitaljs');

async function verilogToYosys(verilogContent, fileName, fileExtension, optimize, fsm) {
    const yosys = await Yosys.initialize({
        print: () => {},
        printErr: (text) => console.error(text),
    });

    const namesv = fileName + fileExtension;
    const nameys = fileName + '.ys';
    const namejson = fileName + '.json';
    const sv = (fileExtension == "sv") ? "-sv " : "";

    const optSimp = optimize ? "opt" : "opt_clean";
    const opt = optimize ? "opt -full" : "opt_clean";

    // @ts-ignore
    const FS = yosys.getModule().FS;
    FS.writeFile(namesv, verilogContent, { encoding: 'utf-8' });

    FS.writeFile(nameys, `
        design -reset;
        read_verilog ${sv}${namesv};
        hierarchy -auto-top;
        proc;
        ${optSimp};
        ${fsm}
        memory -nomap;
        wreduce -memx;
        ${opt};
        write_json ${namejson};
    `, { encoding: 'utf-8' });

    // @ts-ignore
    yosys.getModule().ccall('run', '', ['string'], ['script ' + nameys]);

    const yosysJson = FS.readFile('/work/' + namejson, {encoding: 'utf8'});
    return JSON.parse(yosysJson);
}

async function yosysToDigitalJson(yosysJson) {
    const res = await yosys2digitaljs.custom_process_yosys_json(yosysJson);
    return res.output;
}

module.exports = {
    verilogToYosys,
    yosysToDigitalJson,
};
