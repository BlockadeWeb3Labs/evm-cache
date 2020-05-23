module.exports = function(hexString) {
	return hexString.replace(/^0x/, '\\x');
};
