export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertType;
(function (AlertType) {
    AlertType["TEMPERATURE"] = "temperature";
    AlertType["VOLTAGE"] = "voltage";
    AlertType["SOC"] = "soc";
    AlertType["RUL"] = "rul";
    AlertType["CONNECTIVITY"] = "connectivity";
})(AlertType || (AlertType = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
})(AlertStatus || (AlertStatus = {}));
