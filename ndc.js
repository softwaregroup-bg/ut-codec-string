var merge = require('lodash.merge');
var map = require('./ndcMap');
var defaultFormat = require('./ndc.messages');

function NDC(config, validator, logger) {
    this.fieldSeparator = config.fieldSeparator || '\u001c';
    this.val = validator || null;
    this.log = logger || {};
    this.codes = {};
    this.init(config);
    return this;
}

NDC.prototype.init = function(config) {
    this.messageFormat = merge({}, defaultFormat, config.messageFormat);
    Object.keys(this.messageFormat).forEach((name) => {
        var mf = this.messageFormat[name];
        mf.fieldsSplit = mf.fields.split(',');
        mf.method = name;
        this.codes[(mf.values.messageClass || '') + (mf.values.messageSubclass || '')] = mf;
    });
};

var parsers = {
    // solicited descriptors
    transactionReady: (transactionSerialNumber, transactionData) => ({
        transactionSerialNumber,
        transactionData
    }),
    specificReject: (status) => {
        var e = new Error(map.specificErrors[status] || 'Specific command reject');
        e.type = 'aptra.commandReject.' + status;
        throw e;
    },
    fault: (deviceIdentifierAndStatus, severities, diagnosticStatus, suppliesStatus) => {
        var deviceStatus = deviceIdentifierAndStatus && deviceIdentifierAndStatus.substring && deviceIdentifierAndStatus.substring(1);
        var device =
            deviceIdentifierAndStatus &&
            deviceIdentifierAndStatus.substring &&
            (map.devices[deviceIdentifierAndStatus.substring(0, 1)] || deviceIdentifierAndStatus.substring(0, 1));
        var result = {
            device,
            deviceStatus,
            severities: severities && severities.split && severities.split('').map((severity) => map.severities[severity]),
            diagnosticStatus,
            supplies: suppliesStatus && suppliesStatus.split && suppliesStatus.split('').map((status) => map.supplies[status])
        };
        if (device && device.length > 1 && typeof parsers[device] === 'function') {
            merge(result, parsers[device](deviceStatus));
        }
        return result;
    },
    ready: () => ({}),
    state: function(status) { // do not change to arrow function as proper this and arguments are needed
        var g1 = status.substring(0, 1);
        var fn = g1 && map.statuses[g1] && this[map.statuses[g1]];
        if (typeof fn === 'function') {
            return merge({
                statusType: map.statuses[g1]
            }, fn.apply(this, arguments));
        }
    },

    // terminal state statuses
    supplyCounters: (supplies) => (supplies && supplies.substring && {
        transactionSerialNumber: supplies.substring(1, 5),
        transactionCount: Number.parseInt(supplies.substring(5, 12), 10),
        notes1: Number.parseInt(supplies.substring(12, 17), 10),
        notes2: Number.parseInt(supplies.substring(17, 22), 10),
        notes3: Number.parseInt(supplies.substring(22, 27), 10),
        notes4: Number.parseInt(supplies.substring(27, 32), 10),
        session: {
            cassettes: [
                {count: Number.parseInt(supplies.substring(12, 17), 10)},
                {count: Number.parseInt(supplies.substring(17, 22), 10)},
                {count: Number.parseInt(supplies.substring(22, 27), 10)},
                {count: Number.parseInt(supplies.substring(27, 32), 10)}
            ]
        },
        rejected1: Number.parseInt(supplies.substring(32, 37), 10),
        rejected2: Number.parseInt(supplies.substring(37, 42), 10),
        rejected3: Number.parseInt(supplies.substring(42, 47), 10),
        rejected4: Number.parseInt(supplies.substring(47, 52), 10),
        dispensed1: Number.parseInt(supplies.substring(52, 57), 10),
        dispensed2: Number.parseInt(supplies.substring(57, 62), 10),
        dispensed3: Number.parseInt(supplies.substring(62, 67), 10),
        dispensed4: Number.parseInt(supplies.substring(67, 72), 10),
        last1: Number.parseInt(supplies.substring(72, 77), 10),
        last2: Number.parseInt(supplies.substring(77, 82), 10),
        last3: Number.parseInt(supplies.substring(82, 87), 10),
        last4: Number.parseInt(supplies.substring(87, 92), 10),
        captured: Number.parseInt(supplies.substring(92, 97), 10)
    }),
    datetime: (status) => (status && status.substring && {
        clockStatus: status.substring(0, 1),
        datetime: status.substring(1)
    }),
    configurationId: (config) => ({
        configId: config.substring(1)
    }),
    configuration: (config, hwFitness, hwConfig, supplies, sensors, release, softwareId) => ({
        cofigId: config.substring(1),
        session: {
            cassettes: [
                {fitness: map.severities[hwFitness.substring(15, 16)], supplies: map.suppliesStatus[supplies.substring(15, 16)]},
                {fitness: map.severities[hwFitness.substring(16, 17)], supplies: map.suppliesStatus[supplies.substring(16, 17)]},
                {fitness: map.severities[hwFitness.substring(17, 18)], supplies: map.suppliesStatus[supplies.substring(17, 18)]},
                {fitness: map.severities[hwFitness.substring(18, 19)], supplies: map.suppliesStatus[supplies.substring(18, 19)]}
            ]
        },
        fitness: hwFitness && hwFitness.substring && {
            clock: map.severities[hwFitness.substring(0, 1)],
            comms: map.severities[hwFitness.substring(1, 2)],
            disk: map.severities[hwFitness.substring(2, 3)],
            cardReader: map.severities[hwFitness.substring(3, 4)],
            cashHandler: map.severities[hwFitness.substring(4, 5)],
            depository: map.severities[hwFitness.substring(5, 6)],
            receiptPrinter: map.severities[hwFitness.substring(6, 7)],
            journalPrinter: map.severities[hwFitness.substring(7, 8)],
            nightDepository: map.severities[hwFitness.substring(10, 11)],
            encryptor: map.severities[hwFitness.substring(11, 12)],
            camera: map.severities[hwFitness.substring(12, 13)],
            doorAccess: map.severities[hwFitness.substring(13, 14)],
            flexDisk: map.severities[hwFitness.substring(14, 15)],
            cassette1: map.severities[hwFitness.substring(15, 16)],
            cassette2: map.severities[hwFitness.substring(16, 17)],
            cassette3: map.severities[hwFitness.substring(17, 18)],
            cassette4: map.severities[hwFitness.substring(18, 19)],
            statementPrinter: map.severities[hwFitness.substring(21, 22)],
            signageDisplay: map.severities[hwFitness.substring(22, 23)],
            systemDisplay: map.severities[hwFitness.substring(25, 26)],
            mediaEntry: map.severities[hwFitness.substring(26, 27)],
            envelopeDispenser: map.severities[hwFitness.substring(27, 28)],
            documentProcessing: map.severities[hwFitness.substring(28, 29)],
            coinDispenser: map.severities[hwFitness.substring(29, 30)],
            voiceGuidance: map.severities[hwFitness.substring(32, 33)],
            noteAcceptor: map.severities[hwFitness.substring(34, 35)],
            chequeProcessor: map.severities[hwFitness.substring(35, 36)]
        },
        hwConfig,
        supplies: supplies && supplies.substring && {
            cardReader: [map.suppliesStatus[supplies.substring(3, 4)]],
            depository: [map.suppliesStatus[supplies.substring(5, 6)]],
            receiptPrinter: [map.suppliesStatus[supplies.substring(6, 7)]],
            journalPrinter: [map.suppliesStatus[supplies.substring(7, 8)]],
            cashHandler: [
                map.suppliesStatus[supplies.substring(4, 5)],
                map.suppliesStatus[supplies.substring(15, 16)],
                map.suppliesStatus[supplies.substring(16, 17)],
                map.suppliesStatus[supplies.substring(17, 18)],
                map.suppliesStatus[supplies.substring(18, 19)]
            ]
        },
        sensors: parsers.sensors(' ' + sensors),
        release,
        softwareId
    }),
    hardware: (configuration, product, hardwareConfiguration) => ({
        configId: configuration.substring(2),
        product: product && product.substring && (map.products[product.substring(1)] || ('product' + product.substring(1))),
        hardwareConfiguration: hardwareConfiguration.split('\u001d')
    }),
    supplies: (statuses) => (statuses && statuses.substring && {
        suppliesStatus: statuses.substring(2).split('\u001d').reduce((prev, cur) => {
            var device = cur && cur.substring && map.devices[cur.substring(0, 1)];
            device && (prev[device] = cur.substring(1).split('').map((status) => map.suppliesStatus[status]));
            return prev;
        }, {})
    }),
    fitness: (statuses) => (statuses && statuses.substring && {
        fitnessStatus: statuses.substring(2).split('\u001d').reduce((prev, cur) => {
            var device = cur && cur.substring && map.devices[cur.substring(0, 1)];
            device && (prev[device] = cur.substring(1).split('').map((status) => map.severities[status]));
            return prev;
        }, {})
    }),
    sensor: (sensor, tamper) => (sensor && sensor.substring && tamper && tamper.substring && parsers.sensors(' ' + sensor.substring(2) + tamper.substring(1))),
    release: (release, software) => ({
        release: release && release.substring && release.substring(2).match(/.{1,2}/g),
        software: software && software.substring && software.substring(1)
    }),
    optionDigits: (optionDigits) => ({
        optionDigits: optionDigits && optionDigits.substring && optionDigits.substring(2).split('')
    }),
    depositDefition: (acceptedCashItems) => ({
        acceptedCashItems: acceptedCashItems && acceptedCashItems.substring && acceptedCashItems.substring(2).match(/.{11}/g)
    }),

    // devices
    clock: (status) => (status && status.substring && {
        deviceStatusDescription: map.clockStatuses[status.substring(0, 1)]
    }),
    power: (config) => ({
        config
    }),
    cardReader: (status) => (status && status.substring && {
        deviceStatusDescription: map.cardReaderStatuses[status.substring(0, 1)]
    }),
    cashHandler: (status) => (status && status.substring && {
        deviceStatusDescription: map.cashHandlerStatuses[status.substring(0, 1)],
        dispensed1: status.substring(1, 3),
        dispensed2: status.substring(3, 5),
        dispensed3: status.substring(5, 7),
        dispensed4: status.substring(7, 9)
    }),
    depository: (status) => (status && status.substring && {
        deviceStatusDescription: map.depositoryStatuses[status.substring(0, 1)]
    }),
    receiptPrinter: (status) => (status && status.substring && {
        deviceStatusDescription: map.receiptPrinterStatuses[status.substring(0, 1)]
    }),
    journalPrinter: (status) => (status && status.substring && {
        deviceStatusDescription: map.journalPrinterStatuses[status.substring(0, 1)]
    }),
    encryptor: (status) => (status && status.substring && {
        deviceStatusDescription: map.encryptorStatuses[status.substring(0, 1)]
    }),
    camera: (status) => ({}),
    sensors: (status) => (status && status.substring && {
        deviceStatusDescription: map.sensorStatuses[status.substring(0, 1)],
        supervisorMode: map.sensors[status.substring(1, 2)],
        vibrationSensor: (status.substring(0, 1) !== '2') && map.sensors[status.substring(2, 3)],
        doorSensor: map.sensors[status.substring(3, 4)],
        silentSignalSensor: map.sensors[status.substring(4, 5)],
        electronicsEnclosureSensor: map.sensors[status.substring(5, 6)],
        depositBin: map.sensors[status.substring(6, 7)],
        cardBin: map.sensors[status.substring(7, 8)],
        rejectBin: map.sensors[status.substring(8, 9)],
        cassette1: map.sensors[status.substring(9, 10)],
        cassette2: map.sensors[status.substring(10, 11)],
        cassette3: map.sensors[status.substring(11, 12)],
        cassette4: map.sensors[status.substring(12, 13)],
        coinDispenser: map.sensors[status.substring(13, 14)],
        coinHopper1: map.sensors[status.substring(14, 15)],
        coinHopper2: map.sensors[status.substring(15, 16)],
        coinHopper3: map.sensors[status.substring(16, 17)],
        coinHopper4: map.sensors[status.substring(17, 18)],
        cpmPockets: map.sensors[status.substring(18, 19)]
    }),
    supervisorKeys: (status) => ({
        menu: status
    }),
    statementPrinter: (status) => ({
        deviceStatusDescription: map.statementPrinterStatuses[status.substring(0, 1)]
    }),
    coinDispenser: (status) => ({
        deviceStatusDescription: map.coinDispenserStatuses[status.substring(0, 1)],
        coinsDispensed: status.substring(1).match(/.{1,2}/g)
    }),
    voiceGuidance: (status) => ({}),
    noteAcceptor: (status) => (status && status.substring && {
        deviceStatusDescription: map.noteAcceptorStatuses[status.substring(0, 1)]
    }),

    // message classes
    unsolicitedStatus: function(type, luno, reserved, deviceIdentifierAndStatus, errorSeverity, diagnosticStatus, suppliesStatus) {
        return this.fault(deviceIdentifierAndStatus, errorSeverity, diagnosticStatus, suppliesStatus);
    },
    solicitedStatus: function(type, luno, reserved, descriptor, status) {
        var fn = descriptor && map.descriptors[descriptor] && this[map.descriptors[descriptor]];
        if (typeof fn === 'function') {
            return merge({
                luno,
                descriptor: map.descriptors[descriptor]
            }, fn.apply(this, Array.prototype.slice.call(arguments, 4)));
        }
    },
    encryptorIniData: (type, luno, reserved, identifier, info) => {
        switch (identifier) {
            case '4':
                return {
                    masterKvv: info.substring && info.substring(0, 6)
                };
            case '3':
                return {
                    newKvv: info.substring && info.substring(0, 6)
                };
        }
        return {};
    },
    uploadEjData: (type, luno, reserved1, reserved2, journalData) => ({
        type,
        luno,
        journalData
    }),
    transaction: (type, luno, reserved, timeVariantNumber, trtfmcn, track2, track3, opcode, amount, pin, bufferB, bufferC) => ({
        type,
        luno,
        reserved,
        timeVariantNumber,
        topOfReceipt: trtfmcn && trtfmcn.substring && trtfmcn.substring(0, 1),
        coordination: trtfmcn && trtfmcn.substring && trtfmcn.substring(1, 2),
        track2,
        track3,
        opcode: opcode && opcode.split && opcode.split(''),
        amount,
        pinBlock: pin && pin.split && pin.split('').map((c) => ({
            ':': 'A',
            ';': 'B',
            '<': 'C',
            '=': 'D',
            '>': 'E',
            '?': 'F'
        }[c] || c)).join(''),
        bufferB,
        bufferC
    })
};

NDC.prototype.decode = function(buffer, $meta, context) {
    var message = {};
    var bufferString = buffer.toString();
    if (buffer.length > 0) {
        var tokens = bufferString.split(this.fieldSeparator);
        var command = this.codes[tokens[0]];
        if (command) {
            $meta.mtid = command.mtid;
            $meta.method = (command.mtid === 'response' ? '' : 'aptra.') + command.method;

            switch ($meta.method) {
                case 'solicitedStatus':
                    if (tokens[3] === 'B') {
                        context.traceTransactionReady = context.traceTransactionReady || 1;
                        $meta.trace = 'trn:' + context.traceTransactionReady;
                        context.traceTransactionReady += 1;
                    } else {
                        context.traceTerminal = context.traceTerminal || 1;
                        $meta.trace = 'req:' + context.traceTerminal;
                        context.traceTerminal += 1;
                    }
                    break;
                case 'encryptorIniData':
                    context.traceTerminalKeys = context.traceTerminalKeys || 1;
                    $meta.trace = 'keys:' + context.traceTerminalKeys;
                    context.traceTerminalKeys += 1;
                    break;
            }

            message = {session: context.session};
            var fn = parsers[command.method];
            if (typeof fn === 'function') {
                try {
                    merge(message, fn.apply(parsers, tokens));
                } catch (e) {
                    $meta.mtid = 'error';
                    message.type = e.type;
                    message.message = e.message;
                    if (!e.type) { // capture stack for unexpected errors
                        message.stack = e.stack;
                    }
                }
            } else {
                $meta.mtid = 'error';
                message.type = 'aptra.parser';
                message.message = 'No parser found for message: ' + command.method;
            }
            message.tokens = tokens;
        } else {
            $meta.mtid = 'error';
            message.type = 'aptra.unknownMessageClass';
            message.message = 'Received unknown message class: ' + tokens[0];
        }
    }

    return message;
};

NDC.prototype.encode = function(message, $meta, context) {
    if (typeof this.val === 'function') {
        this.val(message);
    }
    var bufferString = '';

    switch ($meta.method) {
        case 'terminalCommand':
        case 'goInService':
        case 'goOutOfService':
        case 'sendConfigurationId':
        case 'sendSupplyCounters':
        case 'paramsLoadEnhanced':
        case 'currencyMappingLoad':
        case 'stateTableLoad':
        case 'screenDataLoad':
        case 'fitDataLoad':
        case 'dateTimeLoad':
        case 'configIdLoad':
        case 'sendConfiguration':
        case 'sendConfigurationHardware':
        case 'sendConfigurationSuplies':
        case 'sendConfigurationFitness':
        case 'sendConfigurationSensor':
        case 'sendConfigurationRelease':
        case 'sendConfigurationEnhanced':
        case 'sendConfigurationOptionDigits':
        case 'sendConfigurationDepositDefinition':
        case 'emvCurrency':
        case 'emvTransaction':
        case 'emvLanguage':
        case 'emvTerminal':
        case 'emvApplication':
            context.traceCentral = context.traceCentral || 1;
            $meta.trace = 'req:' + context.traceCentral;
            context.traceCentral += 1;
            break;
        case 'keyReadKvv':
        case 'keyChangeTak':
        case 'keyChangeTpk':
            context.traceCentralKeys = context.traceCentralKeys || 1;
            $meta.trace = 'keys:' + context.traceCentralKeys;
            context.traceCentralKeys += 1;
            break;
        case 'transactionReply':
            context.traceTransaction = context.traceTransaction || 1;
            $meta.trace = 'trn:' + context.traceTransaction;
            context.traceTransaction += 1;
            break;
    }

    switch ($meta.method) {
        case 'keyChangeTak':
            context.session = context.session || {};
            context.session.tak = message.tak;
            break;
        case 'keyChangeTpk':
            context.session = context.session || {};
            context.session.tpk = message.tpk;
            break;
        case 'currencyMappingLoad':
            context.session = context.session || {};
            merge(context.session, {cassettes: message.cassettes});
            break;
    }

    var command = this.messageFormat[$meta.method];
    if (command) {
        merge(message, command.values);
        // bufferString += command.messageClass;
        command.fieldsSplit.forEach((field) => {
            if (field.length) {
                if (field === 'FS') {
                    bufferString += this.fieldSeparator;
                } else {
                    bufferString += message[field] || '';
                }
            }
        });
        return new Buffer(bufferString);
    }
};

module.exports = NDC;

// todo checkMac
// todo CashHandlerAlert / CassetteSupplyStatus
// todo ReceiptPrinterAlert / JournalPrinterAlert / PaperSupplyStatus / PrinterPartStatus
// todo OtherDeviceFaultAlert
