// This file implementation was inspired by https://github.com/tilk/digitaljs/blob/master/examples/template.html
// as it serves DigitalJS API which is subject to Copyright 2018 Marek Materzok under BSD 2-Clause
/* eslint-env browser */
/* eslint-env jquery */
/* global digitaljs */

(function () {
    const digitaljsInput = document.digitaljsInput;
    const simplifyDiagram = document.simplifyDiagram;
    const layoutEngine = document.layoutEngine;
    // TODO: restore below line after introducing WorkerEngine
    // const simulationEngine = document.simulationEngine;
    let circuit, monitor, monitorview, iopanel;
    document.addEventListener('DOMContentLoaded', () => {
      let pause = $('button[name=pause]');
      let resume = $('button[name=resume]');
      let single = $('button[name=single]');
      let next = $('button[name=next]');
      let fastFw = $('button[name=fastFw]');
      let papers = {};
      const fixed = function (fixed) {
        Object.values(papers).forEach(p => p.fixed(fixed));
      }
      const loadCircuit = function (json) {
        if (simplifyDiagram) { json = digitaljs.transform.transformCircuit(json) };
        const engines = { Synchronous: digitaljs.engines.BrowserSynchEngine, WebWorker: digitaljs.engines.WorkerEngine };
        // TODO: restore below line after introducing WorkerEngine
        // circuit = new digitaljs.Circuit(json, { layoutEngine: layoutEngine, engine: engines[simulationEngine] });
        circuit = new digitaljs.Circuit(json, { layoutEngine: layoutEngine, engine: engines['Synchronous'] });
        monitor = new digitaljs.Monitor(circuit);
        monitorview = new digitaljs.MonitorView({ model: monitor, el: $('#monitor') });
        iopanel = new digitaljs.IOPanelView({model: circuit, el: $('#iopanel') });
        circuit.on('new:paper', function(paper) {
          paper.fixed($('input[name=fixed]').prop('checked'));
          papers[paper.cid] = paper;
          paper.on('element:pointerdblclick', (cellView) => {
            global.digitaljsCell = cellView.model;
          });
        });
        circuit.on('changeRunning', () => {
          if (circuit.running) {
            pause.prop('disabled', false);
            resume.prop('disabled', true);
            fastFw.prop('disabled', true);
            single.prop('disabled', true);
            next.prop('disabled', true);
          } else {
            pause.prop('disabled', true);
            resume.prop('disabled', false);
            fastFw.prop('disabled', false);
            single.prop('disabled', false);
            next.prop('disabled', !circuit.hasPendingEvents);
          }
        });
        circuit.on('postUpdateGates', (tick) => {
          $('#tick').val(tick);
        });
        circuit.on('userChange', () => {
          next.prop('disabled', circuit.running || !circuit.hasPendingEvents);
        });
        circuit.displayOn($('#paper'));
        fixed($('input[name=fixed]').prop('checked'));
        circuit.on('remove:paper', function(paper) {
          delete papers[paper.cid];
        });
        circuit.start();
      }
      pause.on('click', () => { circuit.stop(); });
      resume.on('click', () => { circuit.start(); });
      fastFw.on('click', () => { circuit.startFast(); });
      single.on('click', () => { circuit.updateGates(); next.prop('disabled', circuit.running || !circuit.hasPendingEvents); });
      next.on('click', () => { circuit.updateGatesNext(); next.prop('disabled', circuit.running || !circuit.hasPendingEvents); });
      $('button[name=serialize]').on('click', () => {
        monitorview.shutdown();
        iopanel.shutdown();
        circuit.stop();
        const json = circuit.toJSON($('input[name=layout]').prop('checked'));
        loadCircuit(json);
      });
      $('input[name=fixed]').change(function () {
        fixed($(this).prop('checked'));
      });
      $('button[name=pptUp]').on('click', () => { monitorview.pixelsPerTick *= 2; });
      $('button[name=pptDown]').on('click', () => { monitorview.pixelsPerTick /= 2; });
      $('button[name=left]').on('click', () => { monitorview.live = false; monitorview.start -= monitorview._width / monitorview.pixelsPerTick / 4; });
      $('button[name=right]').on('click', () => { monitorview.live = false; monitorview.start += monitorview._width / monitorview.pixelsPerTick / 4; });
      $('button[name=live]').on('click', () => { monitorview.live = true; });
      $(document).ready(function () { 
        try { 
          loadCircuit(digitaljsInput) 
        } catch (err) {
          $('#paper').html('<br><br>Circuit could not be loaded properly via DigitalJS:<br>' + err.message + '<br><br>');
        }
      });
    });
}());
