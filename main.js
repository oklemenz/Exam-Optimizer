(function() {
    "use strict";
	
	var lastResult = undefined;
	var lastFittestChromosome = undefined;
	
	$(document).ready(function() {
		$("#download").change(function() {
  			exportLastResult();
		});
	});
	
	function process() {
		select(function(examData, progress, completed) {
			_.startGA(examData, progress, completed);
		});
	}
	
	function processData(examData) {
		run(function(examData, progress, completed) {
			_.startGA(examData, progress, completed);
		}, examData);
	}
	
	function solve() {
		select(function(examData, progress, completed) {
			_.solveGA(examData, progress, completed);
		});
	}

	function solveData(examData) {
		run(function(examData, progress, completed) {
			_.solveGA(examData, progress, completed);
		}, examData);
	}
	
	function select(execute) {
		var file = $("#inputData")[0].files[0];
		if (!file) {
			alert("Select an exam data file!");
			return;
		}
		var fileExtension = file.name.split(".").pop().toLowerCase();
		var reader = new FileReader();
	    reader.onload = (function(e) {
		    var examData = null;
		    if (fileExtension === "json") {
		    	examData = JSON.parse(e.target.result);
		    } else if (fileExtension === "xml") {
				examData = importExcelFormat(e.target.result);
		    }
		    if (examData) {
				run(execute, examData);
		    } else {
		    	alert("No valid data found for selected exam data file");
		    }
	    });
    	reader.readAsText(file);
	}
	
	function run(execute, examData) {
		_.debug(false);
		$("#inputData").attr("disabled", "disabled");
		$("#processData").attr("disabled", "disabled");
		$("#solveData").attr("disabled", "disabled");
		$("#is_valid").html("");
		$("#result").css("display", "block");
		$("#result").html("... running - please wait ...");
		$("#progress").html("running...");				
		var time = Date.now();		
		execute(examData, function(progress) {
			var progressPercent = parseFloat(Math.round(progress * 100 * 100) / 100).toFixed(1);
			var progressText = progressPercent + "%";
			var now = Date.now();
			var elapsed = now - time;
			var remainingTimeText = "Remaining Time: calculating...";
			if (progress > 0) {
				var remainingTime = (elapsed / progress) * (1 - progress);
				remainingTimeText = "Remaining Time: " + millisecondsToString(remainingTime); 
			}
			$("#progress").html(progressText + " (" + remainingTimeText + ")");
		}, function(result, fittestChromosome) {
			lastResult = result;
			lastFittestChromosome = fittestChromosome;
			// For debugging reasons
			_.debug(true);
			//fittestChromosome.repair();
			var valid = fittestChromosome.validate(true);
			var complete = fittestChromosome.validate(false);
			var isValidText = (valid ? "valid" : "not valid") + " (" + (complete ? "complete" : "incomplete") + ")";
			$("#is_valid").html(isValidText);
			var table = convertToFormatHTML(result);
			$("#result").html(table);
			exportLastResult();
			$("#progress").html("done");
			$("#inputData").removeAttr("disabled");
			$("#processData").removeAttr("disabled");
			$("#solveData").removeAttr("disabled");
		});
	}

	function exportLastResult() {
		if (lastResult && $("#download").is(":checked")) {
			var resultFormat = convertToFormatXLS(lastResult);
			exportContent(resultFormat, "exams_" + getFormattedDate() + ".xls", "application/vnd.ms-excel");
		}
	}
	
	function test() {
		var examData =  {
			"Timepoints" : [{
				"ID" : 1,
				"Day" : 1,
				"Name" : "9:00 - 9:20"
			}, {
				"ID" : 2,
				"Day" : 1,
				"Name" : "9:20 - 9:40"
			}],
			"Teachers" : [{
				"ID" : 1,
				"Code" : "OK",
				"Name" : "Oliver Klemenz",
				"Exams" : [{
					"ID" : 1,
					"Class" : "BK1T1",
					"Subject" : "D"
				}, {
					"ID" : 2,
					"Class" : "BK1T1",
					"Subject" : "GK"
				}, {
					"ID" : 3,
					"Class" : "BK1T2",
					"Subject" : "D"
				}, {
					"ID" : 4,
					"Class" : "BK1T2",
					"Subject" : "GK"
				}]
			}, {
				"ID" : 2,
				"Code" : "ALI",
				"Name" : "Alice Wonderland",
				"Exams" : [{
					"ID" : 5,
					"Class" : "BK1T1",
					"Subject" : "M"
				}, {
					"ID" : 6,
					"Class" : "BK1T2",
					"Subject" : "M"
				}]
			}],
			"Students" : [{
				"ID" : 1,
				"Name" : "Max Mustermann",
				"Class" : "BK1T1",
				"Exams" : [{
					"ID" : 1,
					"Subject" : "M"
				}, {
					"ID" : 2,
					"Subject" : "GK"
				}]
			}, {
				"ID" : 2,
				"Name" : "Sandra Sonnig",
				"Class" : "BK1T2",
				"Exams" : [{
					"ID" : 3,
					"Subject" : "D"
				}, {
					"ID" : 4,
					"Subject" : "M"
				}]
			}],
			"Parameters" : {
				"GenerationCount" : 100,
				"PopulationSize" : 100,
				"MutationRate" : 0.7,
				"CrossoverRate" : 0.8,
				"ElitismRate" : 0.01
			}
		};
		
		//processData(examData);
		
		var chromosomeData1 = { 
		   "1" : { "ID" : 1,
			  "classTeacherID" : 2,
			  "examID" : 1,
			  "otherTeacherID" : 1,
			  "studentID" : 1,
			  "subjectTeacherID" : 0,
			  "timepointID" : 1
			},
		  "2" : { "ID" : 2,
			  "classTeacherID" : 1,
			  "examID" : 2,
			  "otherTeacherID" : 2,
			  "studentID" : 1,
			  "subjectTeacherID" : 0,
			  "timepointID" : 0
			},
		  "3" : { "ID" : 3,
			  "classTeacherID" : 1,
			  "examID" : 3,
			  "otherTeacherID" : 2,
			  "studentID" : 2,
			  "subjectTeacherID" : 0,
			  "timepointID" : 1
			},
		  "4" : { "ID" : 4,
			  "classTeacherID" : 2,
			  "examID" : 4,
			  "otherTeacherID" : 1,
			  "studentID" : 2,
			  "subjectTeacherID" : 0,
			  "timepointID" : 0
			}
		};

		var chromosomeData2 = { 
		   "1" : { "ID" : 1,
			  "classTeacherID" : 2,
			  "examID" : 1,
			  "otherTeacherID" : 1,
			  "studentID" : 1,
			  "subjectTeacherID" : 0,
			  "timepointID" : 0
			},
		  "2" : { "ID" : 2,
			  "classTeacherID" : 1,
			  "examID" : 2,
			  "otherTeacherID" : 2,
			  "studentID" : 1,
			  "subjectTeacherID" : 0,
			  "timepointID" : 0
			},
		  "3" : { "ID" : 3,
			  "classTeacherID" : 1,
			  "examID" : 3,
			  "otherTeacherID" : 2,
			  "studentID" : 2,
			  "subjectTeacherID" : 0,
			  "timepointID" : 1
			},
		  "4" : { "ID" : 4,
			  "classTeacherID" : 2,
			  "examID" : 4,
			  "otherTeacherID" : 1,
			  "studentID" : 2,
			  "subjectTeacherID" : 0,
			  "timepointID" : 0
			}
		};     
        
        var result = _.testGA(examData, chromosomeData1);
		var table = convertToFormatHTML(result);
		$("#result").css("display", "block");
		$("#result").html(table);
	}
		
	function importExcelFormat(data) {
		var config = { "Timepoints" : [ "Day", "Name"], 
					   "Teachers" : [ "Code", "Name", { "Exams" : 2 } ],
					   "Students" : [ "Name", "Class", { "Exams" : 1 } ],
					   "Exceptions" : [ "Day", { "Teacher" : 1 } ],
					   "Parameters" : null,
					   "Exams" : [ "Subject", "Class" ],
					   "Teacher" : [ "Code" ] };

		var properties = [ "Timepoints", "Teachers", "Students", "Exceptions", "Parameters" ];
		
		var xmlData = $.parseXML(data);
		var jsonData = {};
		var propertyIndex = 0;

		_.each($(xmlData).find("Worksheet"), function(workSheet) {
			var property = properties[propertyIndex];
			var rowIndex = 0;
			var subArrayEntryIndex = 0;
			if (config[property]) {
				// Structure 
				var propertyContent = [];
				_.each($(workSheet).find("Row"), function(row) {
					if (rowIndex > 0) {
						var rowContent = { ID : rowIndex };
						var ignoreRow = false;
						var columnIndex = 0;
						var subArray = [];
						var subArrayEntry = {};
						var subArrayPropertyCount = 0;
						var subArrayPropertyIndex = 0;
						_.each($(row).find("Cell"), function(cell) {
							
							var cellValue = $(cell).find("Data").text();
							if (cellValue === null || cellValue === undefined || cellValue === "") {
								if (columnIndex == 0) {
									ignoreRow = true;
								}
							}
							
							if (!isNaN(+cellValue)) {
								cellValue = parseFloat(cellValue);
							}
							
							var cellName = config[property][columnIndex];
							
							if (_.isString(cellName)) {
								// Attribute value mapping
								rowContent[cellName] = cellValue;
								columnIndex++;
							} else {
								// Nested array value mapping
								if (cellName && !rowContent[cellName]) {
									var tmpCellName = _.keys(cellName)[0];
									subArrayPropertyCount = cellName[tmpCellName];
									cellName = tmpCellName;
									rowContent[cellName] = subArray;									
								}
								subArrayEntry[config[cellName][subArrayPropertyIndex]] = cellValue;
								subArrayPropertyIndex++;
								if (subArrayPropertyIndex == subArrayPropertyCount) {
									subArrayEntryIndex++;
									subArrayEntry.ID = subArrayEntryIndex;
									subArray.push(subArrayEntry);
									subArrayEntry = {};
									subArrayPropertyIndex = 0;
								}							
							}
						});
						if (!ignoreRow) {
							if (subArrayPropertyIndex > 0) {
								subArrayEntryIndex++;
								subArrayEntry.ID = subArrayEntryIndex;
								subArray.push(subArrayEntry);
								subArrayEntry = {};
								subArrayPropertyIndex = 0;
							}
							propertyContent.push(rowContent);
						}
					}
					rowIndex++;
				});
				jsonData[property] = propertyContent;				
			} else {			
				// Name value pairs
				var propertyContent = {};
				_.each($(workSheet).find("Row"), function(row) {
					if (rowIndex > 0) {
						var parameter = undefined;
						_.each($(row).find("Cell"), function(cell) {
							var cellValue = $(cell).find("Data").text();
							if (!isNaN(+cellValue)) {
								cellValue = parseFloat(cellValue);
							}
							if (!parameter) {
								parameter = cellValue;
							} else if (cellValue) {
								propertyContent[parameter] = cellValue;
							}
						});
					}
					rowIndex++;
				});
				jsonData[property] = propertyContent;
			}
			propertyIndex++;
		});

		return jsonData;
	}
	
	function millisecondsToString(milliseconds) {
		var oneHour = 3600000;
		var oneMinute = 60000;
		var oneSecond = 1000;
		var seconds = 0;
		var minutes = 0;
		var hours = 0;
		var result;
		if (milliseconds >= oneHour) {
			hours = Math.floor(milliseconds / oneHour);
		}
		milliseconds = hours > 0 ? (milliseconds - hours * oneHour) : milliseconds;
		if (milliseconds >= oneMinute) {
			minutes = Math.floor(milliseconds / oneMinute);
		}
		milliseconds = minutes > 0 ? (milliseconds - minutes * oneMinute) : milliseconds;
		if (milliseconds >= oneSecond) {
			seconds = Math.floor(milliseconds / oneSecond);
		}
		milliseconds = seconds > 0 ? (milliseconds - seconds * oneSecond) : milliseconds;
		if (hours > 0) {
			result = (hours > 9 ? hours : "0" + hours) + ":";
		} else {
			result = "00:";
		}
		if (minutes > 0) {
			result += (minutes > 9 ? minutes : "0" + minutes) + ":";
		} else {
			result += "00:";
		}
		if (seconds > 0) {
			result += (seconds > 9 ? seconds : "0" + seconds);
		} else {
			result += "00";
		}
		return result;
	}
	
	function getFormattedDate() {
	    var date = new Date();
    	var dateFormatted = date.getDate() + "-" + (date.getMonth()+1) + "-" + date.getFullYear() + "_" +  
	   		    			date.getHours() + "-" + date.getMinutes();
	    return dateFormatted;
	}
		
	function convertToFormatCSV(oExportData) {
		var csv = [];
        csv.push("sep=" + CSV_SEP);
        csv.push("\n");
            
        for (var i = 0; i < oExportData.headers.length; i++) {
        	var sHeader = oExportData.headers[i];
            csv.push('"' + sHeader + '"');
            csv.push(";");
        }
            
        csv.push("\n");
            
        for (var i = 0; i < oExportData.rows.length; i++) {
        	var oRow = oExportData.rows[i];
            for (var j = 0; j < oRow.cells.length; j++) {
            	var oCell = oRow.cells[j];
                csv.push('"' + oCell.content + '"');
                csv.push(";");
            }
            csv.push("\n");
        }
            
        return csv.join("");
    }
    
    function convertToFormatHTML(oExportData) {
    	var table = $("<table/>");
    	
    	var tr = $("<tr/>");
    	table.append(tr);
    	for (var i = 0; i < oExportData.headers.length; i++) {
        	var sHeader = oExportData.headers[i];
        	var th = $("<th>" + sHeader + "</th>");
			tr.append(th); 
        }
            
        for (var i = 0; i < oExportData.rows.length; i++) {
			var tr = $("<tr/>"); 
			table.append(tr);
        	var oRow = oExportData.rows[i];
            for (var j = 0; j < oRow.cells.length; j++) {
            	var oCell = oRow.cells[j];
            	var td = $("<td>" + oCell.content + "</td>");
            	tr.append(td); 
            }
        }
        
        return table[0].outerHTML;
    }
        
	function convertToFormatXLS(oExportData) {
		var xls = 
			"<?xml version=\"1.0\"?>" + 
			"<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" " + 
			"xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
			"xmlns:x=\"urn:schemas-microsoft-com:office:excel\" " +
			"xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\" " +
			"xmlns:html=\"http://www.w3.org/TR/REC-html40\">" +
			"<DocumentProperties xmlns=\"urn:schemas-microsoft-com:office:office\">" +
			"<LastAuthor>Microsoft Office User</LastAuthor>" +
			"<Created>" + new Date().toISOString() + "</Created>" + 
			"<Version>14.0</Version>" +
			"</DocumentProperties>" +
			"<OfficeDocumentSettings xmlns=\"urn:schemas-microsoft-com:office:office\">" + 
			"<AllowPNG/>" + 
			"</OfficeDocumentSettings>" +  
			"<ExcelWorkbook xmlns=\"urn:schemas-microsoft-com:office:excel\">" +
			"<WindowHeight>10300</WindowHeight>" +
			"<WindowWidth>25720</WindowWidth>" +
			"<WindowTopX>900</WindowTopX>" +
			"<WindowTopY>100</WindowTopY>" +
			"<ProtectStructure>False</ProtectStructure>" +
			"<ProtectWindows>False</ProtectWindows>" +
			"</ExcelWorkbook>" +
			"<Styles>" +
			"<Style ss:ID=\"Default\" ss:Name=\"Normal\">" +
			"<Alignment ss:Vertical=\"Bottom\"/>" +
			"<Borders/>" +
			"<Font ss:FontName=\"Calibri\" ss:Size=\"12\" ss:Color=\"#000000\"/>" +
			"<Interior/>" +
			"<NumberFormat/>" +
			"<Protection/>" +
			"</Style>" + 
			"<Style ss:ID=\"s62\">" +
			"<Font ss:FontName=\"Calibri\" ss:Size=\"12\" ss:Color=\"#000000\" ss:Bold=\"1\"/>" +
			"</Style>" +                
			"<Style ss:ID=\"s63\">" +
			"<NumberFormat ss:Format=\"Short Date\"/>" +
			"</Style>" +
			"<Style ss:ID=\"s64\">" + 
			"<NumberFormat ss:Format=\"Fixed\"/>" + 
			"</Style>" + 
			"</Styles>";
		
		xls += 
			"<Worksheet ss:Name=\"Exams\">" +
			"<Names>" + 
			"<NamedRange ss:Name=\"_FilterDatabase\" ss:RefersTo=\"=Export!R1C1:R1C" + oExportData.headers.length + "\" ss:Hidden=\"1\"/>" +
			"</Names>" + 
			"<Table ss:ExpandedColumnCount=\"" + oExportData.headers.length + "\" ss:ExpandedRowCount=\"" + (oExportData.rows.length + 1) + "\" " + 
			"x:FullColumns=\"1\" x:FullRows=\"1\" ss:DefaultColumnWidth=\"150\" ss:DefaultRowHeight=\"15\">";
		
		xls += 
			"<Row ss:AutoFitHeight=\"0\">";
		for (var i = 0; i < oExportData.headers.length; i++) {
			var sHeader = oExportData.headers[i];
			xls +=
				"<Cell ss:StyleID=\"s62\"><Data ss:Type=\"String\">" + sHeader + "</Data><NamedCell ss:Name=\"_FilterDatabase\"/></Cell>";
		}
		xls +=
			"</Row>";
		
		for (var i = 0; i < oExportData.rows.length; i++) {
			var oRow = oExportData.rows[i];
			xls += 
				"<Row ss:AutoFitHeight=\"0\">";
			for (var j = 0; j < oRow.cells.length; j++) {
				var oCell = oRow.cells[j];
				var sType = "String";
				var sContent = oCell.content;
				var sStyle = "";
				if (oCell.type == "Date" && oCell.contentRaw) {
					sType = "DateTime";
					sContent = oCell.contentRaw.toISOString();
					if (sContent[sContent.length - 1] == "Z") {
						sContent = sContent.substring(0, sContent.length - 1); 
					}
					sStyle = " ss:StyleID=\"s63\"";
				} else if (oCell.type == "Number") {
					sType = "Number"; 
					sStyle = " ss:StyleID=\"s64\"";
				} else if (oCell.type == "Boolean") {
					sType = "Boolean"; 
					sContent = sContent ? 1 : 0;
				}
				xls +=
					"<Cell" + sStyle + "><Data ss:Type=\"" + sType + "\">" + sContent + "</Data></Cell>";
			}
			xls +=
				"</Row>";
		}
		
		xls +=            
			"</Table>" +
			"<WorksheetOptions xmlns=\"urn:schemas-microsoft-com:office:excel\">" +
			"<PageSetup>" +
			"<Header x:Margin=\"0.3\"/>" +
			"<Footer x:Margin=\"0.3\"/>" +
			"<PageMargins x:Bottom=\"0.75\" x:Left=\"0.7\" x:Right=\"0.7\" x:Top=\"0.75\"/>" +
			"</PageSetup>" +
			"<Unsynced/>" + 
			"<PageLayoutZoom>0</PageLayoutZoom>" +
			"<Selected/>" +
			"<FreezePanes/>" + 
			"<FrozenNoSplit/>" + 
			"<SplitHorizontal>1</SplitHorizontal>" +
			"<TopRowBottomPane>1</TopRowBottomPane>" + 
			"<ActivePane>2</ActivePane>" + 
			"<Panes>" + 
			"<Pane><Number>3</Number></Pane>" +
			"<Pane><Number>2</Number><ActiveRow>1</ActiveRow></Pane>" +
			"</Panes>" +
			"<ProtectObjects>False</ProtectObjects>" +
			"<ProtectScenarios>False</ProtectScenarios>" +
			"</WorksheetOptions>" +
			"<AutoFilter xmlns=\"urn:schemas-microsoft-com:office:excel\" x:Range=\"R1C1:R1C" + oExportData.headers.length + "\"/>" +
			"</Worksheet>";
		
		xls +=
			"</Workbook>";
		
		return xls;
	}
    
    function exportContent(sExportData, sFilename, sMimeType, sCharset) {
		var browser = navigator.userAgent.toLowerCase();
		if (browser.indexOf("msie") == -1) {
			downloadContent(sExportData, sFilename, sMimeType, sCharset);
		} else {
			saveContent(sExportData, sFilename, sMimeType, sCharset);
		}
    }
    
    function downloadContent(sExportData, sFilename, sMimeType, sCharset) {
		var downloadLink = $("<a/>", {
			download : sFilename,
			style : {
				display : "none"
			}
		});
		$("body").append(downloadLink);
		
		var uagent = navigator.userAgent.toLowerCase();
		var isSafari = /applewebkit/.test(uagent) && /safari/.test(uagent) && !/chrome/.test(uagent);
		
		if (isSafari) {
			window.open("data:" + sMimeType + ";" + sCharset + "," + encodeURIComponent(sExportData), "_blank");
		} else {
			var sUrl = "data:" + sMimeType;
			if (sCharset) {
				sUrl += ";charset=" + sCharset;
			}                    
			sUrl += "," + encodeURIComponent(sExportData);
			$(downloadLink).attr("href", sUrl);
			downloadLink[0].click();
		}
	}

    function saveContent(sExportData, sFilename, sMimeType, sCharset) {
		if (sMimeType == MIME_TYPE_CSV) {
			sFilename += "." + FORMAT_TXT;
		}
		var dialog = false;
		ifr = document.createElement("iframe");
		ifr.id = "if1";
		ifr.location = "about.blank";
		ifr.style.display = "none";   
		document.getElementsByTagName("body")[0].appendChild(ifr);   
		var innerDocument = document.getElementById("if1").contentWindow.document;
		innerDocument.open(sMimeType, "replace");
		if (sCharset) {
			innerDocument.charset = sCharset;
		}
		innerDocument.write(sExportData);
		innerDocument.close();
		if (sCharset) {
			document.charset = sCharset;
		}
		dialog = innerDocument.execCommand("SaveAs", false, sFilename);
		document.getElementsByTagName("body")[0].removeChild(ifr);
		return dialog;         
	}

	_.mixin({
		process : process,
		solve : solve,
		test : test
	});
})();
